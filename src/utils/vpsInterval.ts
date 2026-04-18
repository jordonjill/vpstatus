import type { Env } from '../types';

// VPS report interval cache
let vpsIntervalCache: { value: number | null; timestamp: number } = {
  value: null,
  timestamp: 0,
};
const VPS_INTERVAL_CACHE_TTL = 60000; // 1 minute
const DEFAULT_VPS_REPORT_INTERVAL_SECONDS = 120;

export async function getVpsReportInterval(env: Env): Promise<number> {
  const now = Date.now();

  if (vpsIntervalCache.value !== null && now - vpsIntervalCache.timestamp < VPS_INTERVAL_CACHE_TTL) {
    return vpsIntervalCache.value;
  }

  try {
    const result = await env.DB.prepare(
      'SELECT value FROM app_config WHERE key = ?'
    )
      .bind('vps_report_interval_seconds')
      .first<{ value: string }>();

    const interval = result?.value ? parseInt(result.value, 10) : DEFAULT_VPS_REPORT_INTERVAL_SECONDS;
    if (!isNaN(interval) && interval > 0) {
      vpsIntervalCache = { value: interval, timestamp: now };
      return interval;
    }
  } catch {
    // Silently ignore errors and use default value
  }

  vpsIntervalCache = { value: DEFAULT_VPS_REPORT_INTERVAL_SECONDS, timestamp: now };
  return DEFAULT_VPS_REPORT_INTERVAL_SECONDS;
}

export function clearVpsIntervalCache(): void {
  vpsIntervalCache = { value: null, timestamp: 0 };
}
