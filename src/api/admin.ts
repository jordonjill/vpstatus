import type { Env, CorsHeadersLike } from '../types';
import { createApiResponse, createErrorResponse, createSuccessResponse } from '../utils/response';
import { parseJsonSafely, validateSqlIdentifier, isValidHttpUrl, extractAndValidateServerId, extractPathSegment } from '../utils/validation';
import { authenticateRequest } from '../auth/middleware';
import { authenticateAdmin } from '../auth/middleware';
import { configCache } from '../cache/configCache';
import { getVpsReportInterval } from '../utils/vpsInterval';
import { clearVpsIntervalCache } from '../utils/vpsInterval';
import { D1_SCHEMAS } from '../db/schema';
import { checkWebsiteStatus } from '../monitoring/sites';
import { handleDbError } from './utils';
import { ensureTablesExist } from '../db/init';

export async function handleAdminRoutes(
  path: string,
  method: string,
  request: Request,
  env: Env,
  corsHeaders: CorsHeadersLike,
  ctx: ExecutionContext
): Promise<Response | null> {
  // Database initialization API
  if (path === '/api/init-db' && ['POST', 'GET'].includes(method)) {
    try {
      await ensureTablesExist(env.DB, env);
      return createSuccessResponse({ message: 'Database initialization complete' }, corsHeaders);
    } catch (error) {
      return createErrorResponse(
        'Database initialization failed',
        `Database initialization failed: ${error instanceof Error ? error.message : 'unknown'}`,
        500,
        corsHeaders
      );
    }
  }

  // ==================== Site Monitoring API ====================

  // Get monitored sites list (admin)
  if (path === '/api/admin/sites' && method === 'GET') {
    const user = await authenticateRequest(request, env);
    if (!user) {
      return createErrorResponse('Unauthorized', 'Admin access required', 401, corsHeaders);
    }

    try {
      const { results } = await env.DB.prepare(`
        SELECT id, name, url, added_at, last_checked, last_status, last_status_code,
               last_response_time_ms, sort_order, is_public
        FROM monitored_sites
        ORDER BY sort_order ASC NULLS LAST, name ASC, url ASC
      `).all();

      return createApiResponse({ sites: results || [] }, 200, corsHeaders);
    } catch (error) {
      if (error instanceof Error && error.message.includes('no such table')) {
        try {
          await env.DB.exec(D1_SCHEMAS.monitored_sites);
          return createApiResponse({ sites: [] }, 200, corsHeaders);
        } catch {
          // ignore
        }
      }
      return handleDbError(error, corsHeaders, 'get sites list');
    }
  }

  // Add monitored site (admin)
  if (path === '/api/admin/sites' && method === 'POST') {
    const user = await authenticateRequest(request, env);
    if (!user) {
      return createErrorResponse('Unauthorized', 'Admin access required', 401, corsHeaders);
    }

    try {
      const body = await parseJsonSafely(request);
      const url = body.url as string;
      const name = body.name as string;

      if (!url || !isValidHttpUrl(url)) {
        return createErrorResponse('Valid URL is required', 'Please enter a valid URL', 400, corsHeaders);
      }

      const siteId = Math.random().toString(36).substring(2, 12);
      const addedAt = Math.floor(Date.now() / 1000);

      const maxOrderResult = await env.DB.prepare(
        'SELECT MAX(sort_order) as max_order FROM monitored_sites'
      ).first<{ max_order: number | null }>();
      const nextSortOrder =
        maxOrderResult?.max_order !== null && typeof maxOrderResult?.max_order === 'number'
          ? maxOrderResult.max_order + 1
          : 0;

      await env.DB.prepare(`
        INSERT INTO monitored_sites (id, url, name, added_at, last_status, sort_order)
        VALUES (?, ?, ?, ?, ?, ?)
      `)
        .bind(siteId, url, name || '', addedAt, 'PENDING', nextSortOrder)
        .run();

      const siteData = { id: siteId, url, name: name || '', added_at: addedAt, last_status: 'PENDING', sort_order: nextSortOrder };

      if (ctx?.waitUntil) {
        ctx.waitUntil(checkWebsiteStatus({ id: siteId, url, name: name || '' }, env.DB, ctx));
      } else {
        checkWebsiteStatus({ id: siteId, url, name: name || '' }, env.DB, ctx).catch(() => { /* ignore */ });
      }

      return new Response(JSON.stringify({ site: siteData }), {
        status: 201,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('UNIQUE constraint failed')) {
          return createErrorResponse('URL already exists or ID conflict', 'This URL is already monitored or there is an ID conflict', 409, corsHeaders);
        }
        if (error.message.includes('no such table')) {
          try {
            await env.DB.exec(D1_SCHEMAS.monitored_sites);
            return createErrorResponse('Database table created, please retry', 'Database table created, please retry the add operation', 503, corsHeaders);
          } catch {
            // ignore
          }
        }
      }
      return handleDbError(error, corsHeaders, 'add monitored site');
    }
  }

  // Update monitored site (admin)
  if (path.match(/\/api\/admin\/sites\/[^/]+$/) && method === 'PUT') {
    const user = await authenticateRequest(request, env);
    if (!user) {
      return createErrorResponse('Unauthorized', 'Admin access required', 401, corsHeaders);
    }

    try {
      const siteId = path.split('/').pop();
      if (!siteId) {
        return createErrorResponse('Invalid site ID', 'Invalid site ID', 400, corsHeaders);
      }

      const body = await request.json() as Record<string, unknown>;
      const url = body.url as string;
      const name = body.name as string;

      if (!url || !url.trim()) {
        return createErrorResponse('Invalid URL', 'URL cannot be empty', 400, corsHeaders);
      }

      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        return createErrorResponse('Invalid URL format', 'URL must start with http:// or https://', 400, corsHeaders);
      }

      const info = await env.DB.prepare('UPDATE monitored_sites SET url = ?, name = ? WHERE id = ?')
        .bind(url.trim(), name?.trim() || '', siteId)
        .run();

      if (info.meta.changes === 0) {
        return createErrorResponse('Site not found', 'Site not found', 404, corsHeaders);
      }

      return createSuccessResponse({ id: siteId, url: url.trim(), name: name?.trim() || '', message: 'Site updated successfully' }, corsHeaders);
    } catch (error) {
      return handleDbError(error, corsHeaders, 'update monitored site');
    }
  }

  // Delete monitored site (admin)
  if (path.match(/\/api\/admin\/sites\/[^/]+$/) && method === 'DELETE') {
    const user = await authenticateAdmin(request, env);
    if (!user) {
      return createErrorResponse('Unauthorized', 'Admin access required', 401, corsHeaders);
    }

    try {
      const siteId = extractAndValidateServerId(path);
      if (!siteId) {
        return createErrorResponse('Invalid site ID', 'Invalid site ID format', 400, corsHeaders);
      }

      const url = new URL(request.url);
      if (url.searchParams.get('confirm') !== 'true') {
        return createErrorResponse('Confirmation required', 'Delete operation requires confirmation, please add ?confirm=true parameter', 400, corsHeaders);
      }

      const info = await env.DB.prepare('DELETE FROM monitored_sites WHERE id = ?').bind(siteId).run();

      if (info.meta.changes === 0) {
        return createErrorResponse('Site not found', 'Site not found', 404, corsHeaders);
      }

      return createSuccessResponse({}, corsHeaders);
    } catch (error) {
      return handleDbError(error, corsHeaders, 'delete monitored site');
    }
  }

  // Batch site reorder
  if (path === '/api/admin/sites/batch-reorder' && method === 'POST') {
    const user = await authenticateRequest(request, env);
    if (!user) {
      return createErrorResponse('Unauthorized', 'Admin access required', 401, corsHeaders);
    }

    try {
      const body = await request.json() as Record<string, unknown>;
      const siteIds = body.siteIds as string[];

      if (!Array.isArray(siteIds) || siteIds.length === 0) {
        return createErrorResponse('Invalid site IDs', 'Invalid site ID array', 400, corsHeaders);
      }

      const updateStmts = siteIds.map((siteId: string, index: number) =>
        env.DB.prepare('UPDATE monitored_sites SET sort_order = ? WHERE id = ?').bind(index, siteId)
      );

      await env.DB.batch(updateStmts);

      return createSuccessResponse({ message: 'Batch reorder complete' }, corsHeaders);
    } catch (error) {
      return handleDbError(error, corsHeaders, 'batch reorder');
    }
  }

  // Auto site sort
  if (path === '/api/admin/sites/auto-sort' && method === 'POST') {
    const user = await authenticateRequest(request, env);
    if (!user) {
      return createErrorResponse('Unauthorized', 'Admin access required', 401, corsHeaders);
    }

    try {
      const body = await request.json() as Record<string, unknown>;
      const sortBy = body.sortBy as string;
      const order = body.order as string;

      const validSortFields = ['custom', 'name', 'url', 'status'];
      const validOrders = ['asc', 'desc'];

      if (!validSortFields.includes(sortBy) || !validOrders.includes(order)) {
        return createErrorResponse('Invalid sort parameters', 'Invalid sort parameters', 400, corsHeaders);
      }

      if (sortBy === 'custom') {
        return createSuccessResponse({ message: 'Set to custom sort order' }, corsHeaders);
      }

      const safeSortBy = validateSqlIdentifier(sortBy, 'column');
      const safeOrder = validateSqlIdentifier(order.toUpperCase(), 'order');

      const { results: sites } = await env.DB.prepare(`
        SELECT id FROM monitored_sites
        ORDER BY ${safeSortBy} ${safeOrder}
      `).all<{ id: string }>();

      const updateStmts = sites.map((site, index) =>
        env.DB.prepare('UPDATE monitored_sites SET sort_order = ? WHERE id = ?').bind(index, site.id)
      );

      await env.DB.batch(updateStmts);

      return createSuccessResponse({ message: `Sorted by ${sortBy} ${order === 'asc' ? 'ascending' : 'descending'}` }, corsHeaders);
    } catch (error) {
      return handleDbError(error, corsHeaders, 'auto sort');
    }
  }

  // Single site move reorder
  if (path.match(/\/api\/admin\/sites\/[^/]+\/reorder$/) && method === 'POST') {
    try {
      const siteId = extractPathSegment(path, 4);
      if (!siteId) {
        return createErrorResponse('Invalid site ID', 'Invalid site ID format', 400, corsHeaders);
      }

      const body = await request.json() as Record<string, unknown>;
      const direction = body.direction as string;
      if (!['up', 'down'].includes(direction)) {
        return createErrorResponse('Invalid direction', 'Invalid direction', 400, corsHeaders);
      }

      const results = await env.DB.batch([
        env.DB.prepare('SELECT id, sort_order FROM monitored_sites ORDER BY sort_order ASC NULLS LAST, name ASC, url ASC'),
      ]);

      const allSites = results[0].results as { id: string; sort_order: number | null }[];
      const currentIndex = allSites.findIndex(s => s.id === siteId);

      if (currentIndex === -1) {
        return createErrorResponse('Site not found', 'Site not found', 404, corsHeaders);
      }

      let targetIndex = -1;
      if (direction === 'up' && currentIndex > 0) targetIndex = currentIndex - 1;
      else if (direction === 'down' && currentIndex < allSites.length - 1) targetIndex = currentIndex + 1;

      if (targetIndex !== -1) {
        const currentSite = allSites[currentIndex];
        const targetSite = allSites[targetIndex];

        if (currentSite.sort_order === null || targetSite.sort_order === null) {
          const updateStmts = allSites.map((site, index) =>
            env.DB.prepare('UPDATE monitored_sites SET sort_order = ? WHERE id = ?').bind(index, site.id)
          );
          await env.DB.batch(updateStmts);

          const updatedResults = await env.DB.batch([
            env.DB.prepare('SELECT id, sort_order FROM monitored_sites ORDER BY sort_order ASC'),
          ]);
          const updatedSites = updatedResults[0].results as { id: string; sort_order: number }[];
          const newCurrentIndex = updatedSites.findIndex(s => s.id === siteId);
          let newTargetIndex = -1;

          if (direction === 'up' && newCurrentIndex > 0) newTargetIndex = newCurrentIndex - 1;
          else if (direction === 'down' && newCurrentIndex < updatedSites.length - 1) newTargetIndex = newCurrentIndex + 1;

          if (newTargetIndex !== -1) {
            const newCurrentOrder = updatedSites[newCurrentIndex].sort_order;
            const newTargetOrder = updatedSites[newTargetIndex].sort_order;
            await env.DB.batch([
              env.DB.prepare('UPDATE monitored_sites SET sort_order = ? WHERE id = ?').bind(newTargetOrder, siteId),
              env.DB.prepare('UPDATE monitored_sites SET sort_order = ? WHERE id = ?').bind(newCurrentOrder, updatedSites[newTargetIndex].id),
            ]);
          }
        } else {
          await env.DB.batch([
            env.DB.prepare('UPDATE monitored_sites SET sort_order = ? WHERE id = ?').bind(targetSite.sort_order, siteId),
            env.DB.prepare('UPDATE monitored_sites SET sort_order = ? WHERE id = ?').bind(currentSite.sort_order, targetSite.id),
          ]);
        }
      }

      return createSuccessResponse({}, corsHeaders);
    } catch (error) {
      return handleDbError(error, corsHeaders, 'reorder');
    }
  }

  // Update site visibility
  if (path.match(/^\/api\/admin\/sites\/([^/]+)\/visibility$/) && method === 'POST') {
    const user = await authenticateRequest(request, env);
    if (!user) {
      return createErrorResponse('Unauthorized', 'Admin access required', 401, corsHeaders);
    }

    try {
      const siteId = path.split('/')[4];
      const body = await request.json() as Record<string, unknown>;
      const isPublic = body.is_public;

      if (typeof isPublic !== 'boolean') {
        return createErrorResponse('Invalid input', 'Visibility must be a boolean', 400, corsHeaders);
      }

      await env.DB.prepare('UPDATE monitored_sites SET is_public = ? WHERE id = ?')
        .bind(isPublic ? 1 : 0, siteId)
        .run();

      return createSuccessResponse({}, corsHeaders);
    } catch (error) {
      return handleDbError(error, corsHeaders, 'update site visibility');
    }
  }

  // ==================== Public API ====================

  // Get all monitored site statuses (public)
  if (path === '/api/sites/status' && method === 'GET') {
    try {
      const authHeader = request.headers.get('Authorization');
      let isAdmin = false;
      if (authHeader?.startsWith('Bearer ')) {
        try {
          const { authenticateRequest: auth } = await import('../auth/middleware');
          const user = await auth(request, env);
          isAdmin = user !== null;
        } catch {
          // ignore
        }
      }

      let query = `
        SELECT id, name, last_checked, last_status, last_status_code, last_response_time_ms
        FROM monitored_sites
      `;
      if (!isAdmin) {
        query += ' WHERE is_public = 1';
      }
      query += ' ORDER BY sort_order ASC NULLS LAST, name ASC, id ASC';

      const { results } = await env.DB.prepare(query).all<Record<string, unknown>>();
      const sites = results || [];

      const nowSeconds = Math.floor(Date.now() / 1000);
      const twentyFourHoursAgoSeconds = nowSeconds - 24 * 60 * 60;

      for (const site of sites) {
        try {
          const { results: historyResults } = await env.DB.prepare(`
            SELECT timestamp, status, status_code, response_time_ms
            FROM site_status_history
            WHERE site_id = ? AND timestamp >= ?
            ORDER BY timestamp DESC
          `)
            .bind(site.id, twentyFourHoursAgoSeconds)
            .all();

          (site as Record<string, unknown>).history = historyResults || [];
        } catch {
          (site as Record<string, unknown>).history = [];
        }
      }

      return createApiResponse({ sites }, 200, corsHeaders);
    } catch (error) {
      if (error instanceof Error && error.message.includes('no such table')) {
        try {
          await env.DB.exec(D1_SCHEMAS.monitored_sites);
          return createApiResponse({ sites: [] }, 200, corsHeaders);
        } catch {
          // ignore
        }
      }
      return handleDbError(error, corsHeaders, 'get site status');
    }
  }

  // Get monitored site history (public)
  if (path.match(/\/api\/sites\/[^/]+\/history$/) && method === 'GET') {
    try {
      const siteId = path.split('/')[3];
      const nowSeconds = Math.floor(Date.now() / 1000);
      const twentyFourHoursAgoSeconds = nowSeconds - 24 * 60 * 60;

      const { results } = await env.DB.prepare(`
        SELECT timestamp, status, status_code, response_time_ms
        FROM site_status_history
        WHERE site_id = ? AND timestamp >= ?
        ORDER BY timestamp DESC
      `)
        .bind(siteId, twentyFourHoursAgoSeconds)
        .all();

      return createApiResponse({ history: results || [] }, 200, corsHeaders);
    } catch (error) {
      if (error instanceof Error && error.message.includes('no such table')) {
        try {
          await env.DB.exec(D1_SCHEMAS.site_status_history);
          return createApiResponse({ history: [] }, 200, corsHeaders);
        } catch {
          // ignore
        }
      }
      return handleDbError(error, corsHeaders, 'get site history');
    }
  }

  // ==================== VPS Settings API ====================

  // Get VPS report interval (public)
  if (path === '/api/admin/settings/vps-report-interval' && method === 'GET') {
    try {
      const interval = await getVpsReportInterval(env);
      return createApiResponse({ interval }, 200, corsHeaders);
    } catch {
      return createApiResponse({ interval: 120 }, 200, corsHeaders);
    }
  }

  // Set VPS report interval (admin)
  if (path === '/api/admin/settings/vps-report-interval' && method === 'POST') {
    const user = await authenticateRequest(request, env);
    if (!user) {
      return createErrorResponse('Unauthorized', 'Admin access required', 401, corsHeaders);
    }

    try {
      const body = await request.json() as Record<string, unknown>;
      const interval = body.interval as number;

      if (typeof interval !== 'number' || interval <= 0 || !Number.isInteger(interval)) {
        return createErrorResponse(
          'Invalid interval value. Must be a positive integer (seconds).',
          'Report interval must be a positive integer',
          400,
          corsHeaders
        );
      }

      await env.DB.prepare('REPLACE INTO app_config (key, value) VALUES (?, ?)')
        .bind('vps_report_interval_seconds', interval.toString())
        .run();

      configCache.clearKey('monitoring_settings');
      clearVpsIntervalCache();

      return createSuccessResponse({ interval }, corsHeaders);
    } catch (error) {
      return handleDbError(error, corsHeaders, 'set VPS report interval');
    }
  }

  return null;
}
