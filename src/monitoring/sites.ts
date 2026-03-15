interface SiteRecord {
  id: string;
  url: string;
  name?: string;
}

export async function checkWebsiteStatus(site: SiteRecord, db: D1Database, ctx: ExecutionContext): Promise<void> {
  return checkWebsiteStatusOptimized(site, db, ctx);
}

export async function checkWebsiteStatusOptimized(site: SiteRecord, db: D1Database, _ctx: ExecutionContext): Promise<void> {
  const { id, url } = site;
  const startTime = Date.now();
  let newStatus = 'PENDING';
  let newStatusCode: number | null = null;
  let newResponseTime: number | null = null;

  try {
    const response = await fetch(url, {
      method: 'HEAD',
      redirect: 'follow',
      signal: AbortSignal.timeout(10000),
    });

    newResponseTime = Date.now() - startTime;
    newStatusCode = response.status;

    if (response.ok || (response.status >= 300 && response.status < 500)) {
      newStatus = 'UP';
    } else {
      newStatus = 'DOWN';
    }
  } catch (error) {
    newResponseTime = Date.now() - startTime;
    if (error instanceof Error && error.name === 'TimeoutError') {
      newStatus = 'TIMEOUT';
    } else {
      newStatus = 'ERROR';
    }
  }

  const checkTime = Math.floor(Date.now() / 1000);

  try {
    await db.batch([
      db
        .prepare(
          'UPDATE monitored_sites SET last_checked = ?, last_status = ?, last_status_code = ?, last_response_time_ms = ? WHERE id = ?'
        )
        .bind(checkTime, newStatus, newStatusCode, newResponseTime, id),
      db
        .prepare(
          'INSERT INTO site_status_history (site_id, timestamp, status, status_code, response_time_ms) VALUES (?, ?, ?, ?, ?)'
        )
        .bind(id, checkTime, newStatus, newStatusCode, newResponseTime),
    ]);
  } catch {
    // Silently ignore database update errors
  }
}
