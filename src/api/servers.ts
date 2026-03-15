import type { Env, CorsHeadersLike } from '../types';
import { createApiResponse, createErrorResponse, createSuccessResponse } from '../utils/response';
import { parseJsonSafely, validateInput, validateSqlIdentifier, maskSensitive, extractAndValidateServerId, extractPathSegment } from '../utils/validation';
import { authenticateAdmin, authenticateRequestOptional } from '../auth/middleware';
import { configCache } from '../cache/configCache';
import { handleDbError } from './utils';

export async function handleServerRoutes(
  path: string,
  method: string,
  request: Request,
  env: Env,
  corsHeaders: CorsHeadersLike
): Promise<Response | null> {
  // Get server list (public, supports admin and guest mode)
  if (path === '/api/servers' && method === 'GET') {
    try {
      const user = await authenticateRequestOptional(request, env);
      const isAdmin = user !== null;
      const servers = await configCache.getServerList(env.DB, isAdmin);
      return createApiResponse({ servers }, 200, corsHeaders);
    } catch (error) {
      return handleDbError(error, corsHeaders, 'get server list');
    }
  }

  // Admin get server list (with detailed info)
  if (path === '/api/admin/servers' && method === 'GET') {
    const user = await authenticateAdmin(request, env);
    if (!user) {
      return createErrorResponse('Unauthorized', 'Admin access required', 401, corsHeaders);
    }

    try {
      const { results } = await env.DB.prepare(`
        SELECT s.id, s.name, s.description, s.created_at, s.sort_order,
               s.api_key, s.is_public, m.timestamp as last_report
        FROM servers s
        LEFT JOIN metrics m ON s.id = m.server_id
        ORDER BY s.sort_order ASC NULLS LAST, s.name ASC
      `).all<Record<string, unknown>>();

      const url = new URL(request.url);
      const showFullKey = url.searchParams.get('full_key') === 'true';

      const servers = (results || []).map(server => ({
        ...server,
        api_key: showFullKey ? server.api_key : maskSensitive(server.api_key as string),
      }));

      return createApiResponse({ servers }, 200, corsHeaders);
    } catch (error) {
      return handleDbError(error, corsHeaders, 'get admin server list');
    }
  }

  // Add server (admin)
  if (path === '/api/admin/servers' && method === 'POST') {
    const user = await authenticateAdmin(request, env);
    if (!user) {
      return createErrorResponse('Unauthorized', 'Admin access required', 401, corsHeaders);
    }

    try {
      const body = await parseJsonSafely(request);
      const name = body.name as string;
      const description = body.description as string;

      if (!validateInput(name, 'serverName')) {
        return createErrorResponse('Invalid server name', 'Invalid server name format', 400, corsHeaders);
      }

      const serverId = Math.random().toString(36).substring(2, 8);
      const apiKey = Array.from(crypto.getRandomValues(new Uint8Array(32)), b =>
        b.toString(16).padStart(2, '0')
      ).join('');
      const now = Math.floor(Date.now() / 1000);

      await env.DB.prepare(`
        INSERT INTO servers (id, name, description, api_key, created_at, sort_order, is_public)
        VALUES (?, ?, ?, ?, ?, 0, 1)
      `)
        .bind(serverId, name, description || '', apiKey, now)
        .run();

      configCache.clearKey('servers_admin');
      configCache.clearKey('servers_public');

      return createSuccessResponse(
        {
          server: {
            id: serverId,
            name,
            description: description || '',
            api_key: maskSensitive(apiKey),
            created_at: now,
          },
        },
        corsHeaders
      );
    } catch (error) {
      return handleDbError(error, corsHeaders, 'add server');
    }
  }

  // Update server (admin)
  if (path.match(/\/api\/admin\/servers\/[^/]+$/) && method === 'PUT') {
    const user = await authenticateAdmin(request, env);
    if (!user) {
      return createErrorResponse('Unauthorized', 'Admin access required', 401, corsHeaders);
    }

    try {
      const serverId = extractAndValidateServerId(path);
      if (!serverId) {
        return createErrorResponse('Invalid server ID', 'Invalid server ID format', 400, corsHeaders);
      }

      const body = await request.json() as Record<string, unknown>;
      const name = body.name as string;
      const description = body.description as string;

      if (!validateInput(name, 'serverName')) {
        return createErrorResponse('Invalid server name', 'Invalid server name format', 400, corsHeaders);
      }

      const info = await env.DB.prepare('UPDATE servers SET name = ?, description = ? WHERE id = ?')
        .bind(name, description || '', serverId)
        .run();

      if (info.meta.changes === 0) {
        return createErrorResponse('Server not found', 'Server not found', 404, corsHeaders);
      }

      configCache.clearKey('servers_admin');
      configCache.clearKey('servers_public');

      return createSuccessResponse({ id: serverId, name, description: description || '', message: 'Server updated successfully' }, corsHeaders);
    } catch (error) {
      return handleDbError(error, corsHeaders, 'update server');
    }
  }

  // Delete server (admin)
  if (path.match(/\/api\/admin\/servers\/[^/]+$/) && method === 'DELETE') {
    const user = await authenticateAdmin(request, env);
    if (!user) {
      return createErrorResponse('Unauthorized', 'Admin access required', 401, corsHeaders);
    }

    try {
      const serverId = extractAndValidateServerId(path);
      if (!serverId) {
        return createErrorResponse('Invalid server ID', 'Invalid server ID format', 400, corsHeaders);
      }

      const url = new URL(request.url);
      if (url.searchParams.get('confirm') !== 'true') {
        return createErrorResponse(
          'Confirmation required',
          'Delete operation requires confirmation, please add ?confirm=true parameter',
          400,
          corsHeaders
        );
      }

      const info = await env.DB.prepare('DELETE FROM servers WHERE id = ?').bind(serverId).run();
      if (info.meta.changes === 0) {
        return createErrorResponse('Server not found', 'Server not found', 404, corsHeaders);
      }

      await env.DB.prepare('DELETE FROM metrics WHERE server_id = ?').bind(serverId).run();

      configCache.clearKey('servers_admin');
      configCache.clearKey('servers_public');

      return createSuccessResponse({ message: 'Server deleted' }, corsHeaders);
    } catch (error) {
      return handleDbError(error, corsHeaders, 'delete server');
    }
  }

  // Batch server reorder
  if (path === '/api/admin/servers/batch-reorder' && method === 'POST') {
    const user = await authenticateAdmin(request, env);
    if (!user) {
      return createErrorResponse('Unauthorized', 'Admin access required', 401, corsHeaders);
    }

    try {
      const body = await request.json() as Record<string, unknown>;
      const serverIds = body.serverIds as string[];

      if (!Array.isArray(serverIds) || serverIds.length === 0) {
        return createErrorResponse('Invalid server IDs', 'Invalid server ID array', 400, corsHeaders);
      }

      const updateStmts = serverIds.map((serverId: string, index: number) =>
        env.DB.prepare('UPDATE servers SET sort_order = ? WHERE id = ?').bind(index, serverId)
      );

      await env.DB.batch(updateStmts);

      return createSuccessResponse({ message: 'Batch reorder complete' }, corsHeaders);
    } catch (error) {
      return handleDbError(error, corsHeaders, 'batch reorder');
    }
  }

  // Auto server sort
  if (path === '/api/admin/servers/auto-sort' && method === 'POST') {
    const user = await authenticateAdmin(request, env);
    if (!user) {
      return createErrorResponse('Unauthorized', 'Admin access required', 401, corsHeaders);
    }

    try {
      const body = await request.json() as Record<string, unknown>;
      const sortBy = body.sortBy as string;
      const order = body.order as string;

      const validSortFields = ['custom', 'name', 'status'];
      const validOrders = ['asc', 'desc'];

      if (!validSortFields.includes(sortBy) || !validOrders.includes(order)) {
        return createErrorResponse('Invalid sort parameters', 'Invalid sort parameters', 400, corsHeaders);
      }

      if (sortBy === 'custom') {
        return createSuccessResponse({ message: 'Set to custom sort order' }, corsHeaders);
      }

      const safeOrder = validateSqlIdentifier(order.toUpperCase(), 'order');
      let orderClause = '';
      if (sortBy === 'name') {
        orderClause = `ORDER BY name ${safeOrder}`;
      } else if (sortBy === 'status') {
        orderClause = `ORDER BY (CASE WHEN m.timestamp IS NULL OR (strftime('%s', 'now') - m.timestamp) > 300 THEN 1 ELSE 0 END) ${safeOrder}, name ASC`;
      }

      const { results: servers } = await env.DB.prepare(`
        SELECT s.id FROM servers s
        LEFT JOIN metrics m ON s.id = m.server_id
        ${orderClause}
      `).all<{ id: string }>();

      const updateStmts = servers.map((server, index) =>
        env.DB.prepare('UPDATE servers SET sort_order = ? WHERE id = ?').bind(index, server.id)
      );

      await env.DB.batch(updateStmts);

      return createSuccessResponse(
        { message: `Sorted by ${sortBy} ${order === 'asc' ? 'ascending' : 'descending'}` },
        corsHeaders
      );
    } catch (error) {
      return handleDbError(error, corsHeaders, 'auto sort');
    }
  }

  // Single server move reorder
  if (path.match(/\/api\/admin\/servers\/[^/]+\/reorder$/) && method === 'POST') {
    try {
      const serverId = extractPathSegment(path, 4);
      if (!serverId) {
        return createErrorResponse('Invalid server ID', 'Invalid server ID format', 400, corsHeaders);
      }

      const body = await request.json() as Record<string, unknown>;
      const direction = body.direction as string;
      if (!['up', 'down'].includes(direction)) {
        return createErrorResponse('Invalid direction', 'Invalid direction', 400, corsHeaders);
      }

      const results = await env.DB.batch([
        env.DB.prepare('SELECT id, sort_order FROM servers ORDER BY sort_order ASC NULLS LAST, name ASC'),
      ]);

      const allServers = results[0].results as { id: string; sort_order: number | null }[];
      const currentIndex = allServers.findIndex(s => s.id === serverId);

      if (currentIndex === -1) {
        return createErrorResponse('Server not found', 'Server not found', 404, corsHeaders);
      }

      let targetIndex = -1;
      if (direction === 'up' && currentIndex > 0) {
        targetIndex = currentIndex - 1;
      } else if (direction === 'down' && currentIndex < allServers.length - 1) {
        targetIndex = currentIndex + 1;
      }

      if (targetIndex !== -1) {
        const currentServer = allServers[currentIndex];
        const targetServer = allServers[targetIndex];

        if (currentServer.sort_order === null || targetServer.sort_order === null) {
          const updateStmts = allServers.map((server, index) =>
            env.DB.prepare('UPDATE servers SET sort_order = ? WHERE id = ?').bind(index, server.id)
          );
          await env.DB.batch(updateStmts);

          const updatedResults = await env.DB.batch([
            env.DB.prepare('SELECT id, sort_order FROM servers ORDER BY sort_order ASC'),
          ]);
          const updatedServers = updatedResults[0].results as { id: string; sort_order: number }[];
          const newCurrentIndex = updatedServers.findIndex(s => s.id === serverId);
          let newTargetIndex = -1;

          if (direction === 'up' && newCurrentIndex > 0) newTargetIndex = newCurrentIndex - 1;
          else if (direction === 'down' && newCurrentIndex < updatedServers.length - 1) newTargetIndex = newCurrentIndex + 1;

          if (newTargetIndex !== -1) {
            const newCurrentOrder = updatedServers[newCurrentIndex].sort_order;
            const newTargetOrder = updatedServers[newTargetIndex].sort_order;
            await env.DB.batch([
              env.DB.prepare('UPDATE servers SET sort_order = ? WHERE id = ?').bind(newTargetOrder, serverId),
              env.DB.prepare('UPDATE servers SET sort_order = ? WHERE id = ?').bind(newCurrentOrder, updatedServers[newTargetIndex].id),
            ]);
          }
        } else {
          await env.DB.batch([
            env.DB.prepare('UPDATE servers SET sort_order = ? WHERE id = ?').bind(targetServer.sort_order, serverId),
            env.DB.prepare('UPDATE servers SET sort_order = ? WHERE id = ?').bind(currentServer.sort_order, targetServer.id),
          ]);
        }
      }

      return createSuccessResponse({}, corsHeaders);
    } catch (error) {
      return handleDbError(error, corsHeaders, 'reorder');
    }
  }

  // Update server visibility
  if (path.match(/^\/api\/admin\/servers\/([^/]+)\/visibility$/) && method === 'POST') {
    const user = await authenticateAdmin(request, env);
    if (!user) {
      return createErrorResponse('Unauthorized', 'Admin access required', 401, corsHeaders);
    }

    try {
      const serverId = path.split('/')[4];
      const body = await request.json() as Record<string, unknown>;
      const isPublic = body.is_public;

      if (typeof isPublic !== 'boolean') {
        return createErrorResponse('Invalid input', 'Visibility must be a boolean', 400, corsHeaders);
      }

      await env.DB.prepare('UPDATE servers SET is_public = ? WHERE id = ?')
        .bind(isPublic ? 1 : 0, serverId)
        .run();

      return createSuccessResponse({}, corsHeaders);
    } catch (error) {
      return handleDbError(error, corsHeaders, 'update server visibility');
    }
  }

  return null;
}
