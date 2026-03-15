import type { Env, CorsHeadersLike, ServerRecord } from '../types';
import { createApiResponse, createErrorResponse, createSuccessResponse } from '../utils/response';
import { validateAndFixVpsData } from '../utils/vpsData';
import { getVpsReportInterval } from '../utils/vpsInterval';
import { vpsBatchProcessor, flushVpsBatchData } from '../utils/batch';
import { authenticateRequestOptional } from '../auth/middleware';
import { handleDbError } from './utils';

interface AuthResult {
  success?: boolean;
  error?: string;
  message?: string;
  serverId?: string;
  serverData?: ServerRecord;
}

export async function validateServerAuth(path: string, request: Request, env: Env): Promise<AuthResult> {
  const pathParts = path.split('/');
  const serverId = pathParts[3];

  if (!serverId || !/^[a-zA-Z0-9_-]{1,50}$/.test(serverId)) {
    return { error: 'Invalid server ID', message: 'Invalid server ID format' };
  }

  const apiKey = request.headers.get('X-API-Key') || request.headers.get('Authorization')?.replace('Bearer ', '');
  if (!apiKey) {
    return { error: 'Missing API key', message: 'Missing API key' };
  }

  const serverData = await env.DB.prepare(
    'SELECT id, name, description, api_key FROM servers WHERE id = ?'
  )
    .bind(serverId)
    .first<ServerRecord & { api_key: string }>();

  if (!serverData || serverData.api_key !== apiKey) {
    return { error: 'Unauthorized', message: 'Invalid API key' };
  }

  return { success: true, serverId, serverData };
}

export async function handleVpsRoutes(
  path: string,
  method: string,
  request: Request,
  env: Env,
  corsHeaders: CorsHeadersLike,
  ctx: ExecutionContext
): Promise<Response | null> {
  // VPS config fetch
  if (path.startsWith('/api/config/') && method === 'GET') {
    try {
      const authResult = await validateServerAuth(path, request, env);
      if (!authResult.success) {
        return createErrorResponse(
          authResult.error!,
          authResult.message!,
          authResult.error === 'Invalid server ID' ? 400 : 401,
          corsHeaders
        );
      }

      const { serverId, serverData } = authResult;
      const reportInterval = await getVpsReportInterval(env);

      return createApiResponse(
        {
          success: true,
          config: {
            report_interval: reportInterval,
            enabled_metrics: ['cpu', 'memory', 'disk', 'network', 'uptime'],
            server_info: {
              id: serverData!.id,
              name: serverData!.name,
              description: serverData!.description || '',
            },
          },
          timestamp: Math.floor(Date.now() / 1000),
        },
        200,
        corsHeaders
      );
    } catch (error) {
      return handleDbError(error, corsHeaders, 'config fetch');
    }
  }

  // VPS data report
  if (path.startsWith('/api/report/') && method === 'POST') {
    try {
      const authResult = await validateServerAuth(path, request, env);
      if (!authResult.success) {
        return createErrorResponse(
          authResult.error!,
          authResult.message!,
          authResult.error === 'Invalid server ID' ? 400 : 401,
          corsHeaders
        );
      }

      const { serverId } = authResult;

      let reportData: Record<string, unknown>;
      try {
        const rawBody = await request.text();
        reportData = JSON.parse(rawBody) as Record<string, unknown>;
      } catch (parseError) {
        return createErrorResponse(
          'Invalid JSON format',
          `JSON parse failed: ${parseError instanceof Error ? parseError.message : 'unknown'}`,
          400,
          corsHeaders,
          'Please check that the reported JSON format is correct'
        );
      }

      const validationResult = validateAndFixVpsData(reportData);
      if (!validationResult.success) {
        return createErrorResponse(
          validationResult.error!,
          validationResult.message!,
          400,
          corsHeaders,
          validationResult.details
        );
      }

      const validatedData = validationResult.data!;
      const currentInterval = await getVpsReportInterval(env);

      const shouldFlush = vpsBatchProcessor.addReport(serverId!, validatedData, currentInterval);

      if (shouldFlush) {
        ctx.waitUntil(flushVpsBatchData(env));
      } else if (vpsBatchProcessor.shouldFlush(currentInterval)) {
        ctx.waitUntil(flushVpsBatchData(env));
      }

      return createSuccessResponse({ interval: currentInterval }, corsHeaders);
    } catch (error) {
      return handleDbError(error, corsHeaders, 'data report');
    }
  }

  // Batch VPS status query (public, supports admin and guest mode)
  if (path === '/api/status/batch' && method === 'GET') {
    try {
      const user = await authenticateRequestOptional(request, env);
      const isAdmin = user !== null;

      const { results } = await env.DB.prepare(`
        SELECT s.id, s.name, s.description,
               m.timestamp, m.cpu, m.memory, m.disk, m.network, m.uptime
        FROM servers s
        LEFT JOIN metrics m ON s.id = m.server_id
        WHERE s.is_public = 1 OR ? = 1
        ORDER BY s.sort_order ASC NULLS LAST, s.name ASC
      `)
        .bind(isAdmin ? 1 : 0)
        .all<Record<string, unknown>>();

      const servers = (results || []).map(row => {
        const server = { id: row.id, name: row.name, description: row.description };
        let metrics = null;

        if (row.timestamp) {
          metrics = { timestamp: row.timestamp, uptime: row.uptime } as Record<string, unknown>;

          try {
            if (row.cpu) (metrics as Record<string, unknown>).cpu = JSON.parse(row.cpu as string);
            if (row.memory) (metrics as Record<string, unknown>).memory = JSON.parse(row.memory as string);
            if (row.disk) (metrics as Record<string, unknown>).disk = JSON.parse(row.disk as string);
            if (row.network) (metrics as Record<string, unknown>).network = JSON.parse(row.network as string);
          } catch {
            // Silently ignore JSON parse errors
          }
        }

        return { server, metrics, error: false };
      });

      return createApiResponse({ servers }, 200, corsHeaders);
    } catch (error) {
      return handleDbError(error, corsHeaders, 'batch VPS status query');
    }
  }

  // VPS single status query
  if (path.startsWith('/api/status/') && method === 'GET') {
    try {
      const serverId = path.split('/')[3];
      if (!serverId) {
        return createErrorResponse('Invalid server ID', 'Invalid server ID', 400, corsHeaders);
      }

      const serverData = await env.DB.prepare(
        'SELECT id, name, description FROM servers WHERE id = ?'
      )
        .bind(serverId)
        .first<{ id: string; name: string; description: string }>();

      if (!serverData) {
        return createErrorResponse('Server not found', 'Server not found', 404, corsHeaders);
      }

      const metricsData = await env.DB.prepare(`
        SELECT * FROM metrics
        WHERE server_id = ?
        ORDER BY timestamp DESC
        LIMIT 1
      `)
        .bind(serverId)
        .first<Record<string, unknown>>();

      if (metricsData) {
        try {
          if (metricsData.cpu) metricsData.cpu = JSON.parse(metricsData.cpu as string);
          if (metricsData.memory) metricsData.memory = JSON.parse(metricsData.memory as string);
          if (metricsData.disk) metricsData.disk = JSON.parse(metricsData.disk as string);
          if (metricsData.network) metricsData.network = JSON.parse(metricsData.network as string);
        } catch {
          // Silently ignore
        }
      }

      return createApiResponse({ server: serverData, metrics: metricsData || null, error: false }, 200, corsHeaders);
    } catch (error) {
      return handleDbError(error, corsHeaders, 'VPS status query');
    }
  }

  // 12-hour metrics history for a server
  if (path.startsWith('/api/history/') && method === 'GET') {
    const TWELVE_HOURS_SECONDS = 12 * 60 * 60;
    try {
      const serverId = path.split('/')[3];
      if (!serverId || !/^[a-zA-Z0-9_-]{1,50}$/.test(serverId)) {
        return createErrorResponse('Invalid server ID', 'Invalid server ID format', 400, corsHeaders);
      }

      // Check if server is public or if request is authenticated
      const serverData = await env.DB.prepare(
        'SELECT id, is_public FROM servers WHERE id = ?'
      )
        .bind(serverId)
        .first<{ id: string; is_public: number }>();

      if (!serverData) {
        return createErrorResponse('Server not found', 'Server not found', 404, corsHeaders);
      }

      if (!serverData.is_public) {
        const user = await authenticateRequestOptional(request, env);
        if (!user) {
          return createErrorResponse('Unauthorized', 'Authentication required for private server', 401, corsHeaders);
        }
      }

      const twelveHoursAgo = Math.floor(Date.now() / 1000) - TWELVE_HOURS_SECONDS;

      const { results } = await env.DB.prepare(`
        SELECT timestamp, cpu, memory, disk, network, uptime
        FROM metrics_history
        WHERE server_id = ? AND timestamp >= ?
        ORDER BY timestamp ASC
      `)
        .bind(serverId, twelveHoursAgo)
        .all<Record<string, unknown>>();

      const history = (results || []).map(row => {
        const item: Record<string, unknown> = { timestamp: row.timestamp, uptime: row.uptime };
        try {
          if (row.cpu) item.cpu = JSON.parse(row.cpu as string);
          if (row.memory) item.memory = JSON.parse(row.memory as string);
          if (row.disk) item.disk = JSON.parse(row.disk as string);
          if (row.network) item.network = JSON.parse(row.network as string);
        } catch {
          // Silently ignore JSON parse errors
        }
        return item;
      });

      return createApiResponse({ server_id: serverId, history }, 200, corsHeaders);
    } catch (error) {
      return handleDbError(error, corsHeaders, 'metrics history query');
    }
  }

  return null;
}
