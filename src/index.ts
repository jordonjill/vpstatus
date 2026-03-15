import type { Env } from './types';
import { ensureTablesExist } from './db/init';
import { performDatabaseMaintenance } from './db/maintenance';
import { handleApiRequest } from './api/router';
import { handleInstallScript } from './install/script';
import { handleFrontendRequest } from './frontend/handler';
import { checkWebsiteStatusOptimized } from './monitoring/sites';
import { scheduleVpsBatchFlush } from './utils/batch';
import { getVpsReportInterval } from './utils/vpsInterval';

// Module-level state variables
let dbInitialized = false;
let taskCounter = 0;

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    // Only initialize database tables when necessary
    if (!dbInitialized) {
      try {
        await ensureTablesExist(env.DB, env);
        dbInitialized = true;
      } catch {
        // Silently ignore database initialization failures
      }
    }

    // Scheduled flush of VPS batch data (checked on each request)
    scheduleVpsBatchFlush(env, ctx, () => getVpsReportInterval(env));

    const url = new URL(request.url);
    const path = url.pathname;

    // Handle API requests
    if (path.startsWith('/api/')) {
      return handleApiRequest(request, env, ctx);
    }

    // Handle install script
    if (path === '/install.sh') {
      return handleInstallScript(request, url, env);
    }

    // Handle frontend static files
    return handleFrontendRequest(request, path);
  },

  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    taskCounter++;

    ctx.waitUntil(
      (async () => {
        try {
          // Smart database initialization - only run when necessary
          if (!dbInitialized || taskCounter % 10 === 1) {
            await ensureTablesExist(env.DB, env);
            dbInitialized = true;
          }

          // Website monitoring
          const { results: sitesToCheck } = await env.DB.prepare(
            'SELECT id, url, name FROM monitored_sites'
          ).all<{ id: string; url: string; name: string }>();

          if (sitesToCheck && sitesToCheck.length > 0) {
            const siteConcurrencyLimit = 5;
            const sitePromises: Promise<void>[] = [];

            for (const site of sitesToCheck) {
              sitePromises.push(checkWebsiteStatusOptimized(site, env.DB, ctx));
              if (sitePromises.length >= siteConcurrencyLimit) {
                await Promise.all(sitePromises);
                sitePromises.length = 0;
              }
            }

            if (sitePromises.length > 0) {
              await Promise.all(sitePromises);
            }
          }

          // Database maintenance check (runs once per day)
          if (taskCounter % 1440 === 0) {
            await performDatabaseMaintenance(env.DB);
          }
        } catch {
          // Silently ignore scheduled task errors
        }
      })()
    );
  },
};
