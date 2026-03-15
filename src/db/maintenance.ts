import { cleanupJWTCache } from '../auth/jwt';

export async function performDatabaseMaintenance(db: D1Database): Promise<void> {
  const thirtyDaysAgo = Math.floor(Date.now() / 1000) - 30 * 24 * 60 * 60;
  const twelveHoursAgo = Math.floor(Date.now() / 1000) - 43200;

  try {
    await db.batch([
      db.prepare('DELETE FROM site_status_history WHERE timestamp < ?').bind(thirtyDaysAgo),
      db.prepare('DELETE FROM metrics_history WHERE timestamp < ?').bind(twelveHoursAgo),
    ]);

    cleanupJWTCache();
  } catch {
    // Silently ignore database maintenance errors
  }
}
