import { cleanupJWTCache } from '../auth/jwt';

// D1's free plan allows 100k rows written and 5M rows read per day per account, and a
// deleted row costs one write plus one per index. Deletes therefore run in bounded chunks:
// each statement only looks at the oldest `chunk` ids (ids grow with time), so a run reads
// at most `chunk` rows and a large backlog drains over many runs instead of one huge
// DELETE that blows the daily quota.
const SITE_HISTORY_RETENTION_SECONDS = 7 * 24 * 60 * 60; // the UI shows 24h; keep a week
const METRICS_HISTORY_RETENTION_SECONDS = 12 * 60 * 60; // the UI shows 12h
const SITE_HISTORY_CHUNK = 1000; // ~2k writes per run, ~48k/day while draining a backlog
const METRICS_HISTORY_CHUNK = 5000; // well over one hour of reports in normal use

function chunkedDelete(
  db: D1Database,
  table: 'site_status_history' | 'metrics_history',
  cutoff: number,
  chunk: number
): D1PreparedStatement {
  return db
    .prepare(
      `DELETE FROM ${table}
       WHERE id <= (SELECT MIN(id) FROM ${table}) + ?
         AND timestamp < ?`
    )
    .bind(chunk, cutoff);
}

// Called once an hour from the cron trigger.
export async function performDatabaseMaintenance(db: D1Database): Promise<void> {
  const now = Math.floor(Date.now() / 1000);

  try {
    await db.batch([
      chunkedDelete(db, 'site_status_history', now - SITE_HISTORY_RETENTION_SECONDS, SITE_HISTORY_CHUNK),
      chunkedDelete(db, 'metrics_history', now - METRICS_HISTORY_RETENTION_SECONDS, METRICS_HISTORY_CHUNK),
    ]);

    cleanupJWTCache();
  } catch (error) {
    console.error('Database maintenance failed:', error);
  }
}
