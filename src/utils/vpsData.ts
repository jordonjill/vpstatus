import type { VpsReportData, VpsValidationResult } from '../types';

// VPS data default values
export const VPS_DATA_DEFAULTS = {
  cpu: { usage_percent: 0, load_avg: [0, 0, 0] },
  memory: { total: 0, used: 0, free: 0, usage_percent: 0 },
  disk: { total: 0, used: 0, free: 0, usage_percent: 0 },
  network: { upload_speed: 0, download_speed: 0, total_upload: 0, total_download: 0 },
};

type VpsFieldName = 'cpu' | 'memory' | 'disk' | 'network';

export function validateAndFixVpsField(data: unknown, field: VpsFieldName): Record<string, number | number[]> {
  if (!data || typeof data !== 'object') return VPS_DATA_DEFAULTS[field] as Record<string, number | number[]>;

  const converted: Record<string, number | number[]> = {};
  for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
    if (Array.isArray(value)) {
      converted[key] = value.map(v => (typeof v === 'string' ? parseFloat(v) || 0 : (v as number) || 0));
    } else {
      converted[key] = typeof value === 'string' ? parseFloat(value) || 0 : (value as number) || 0;
    }
  }

  return converted;
}

export function validateAndFixVpsData(reportData: Record<string, unknown>): VpsValidationResult {
  const requiredFields = ['timestamp', 'cpu', 'memory', 'disk', 'network', 'uptime'];

  for (const field of requiredFields) {
    if (!reportData[field]) {
      return { error: 'Invalid data format', message: `Missing field: ${field}` };
    }
  }

  const fixed: Record<string, unknown> = { ...reportData };
  (['cpu', 'memory', 'disk', 'network'] as VpsFieldName[]).forEach(field => {
    fixed[field] = validateAndFixVpsField(reportData[field], field);
  });

  fixed.timestamp = parseInt(String(reportData.timestamp)) || Math.floor(Date.now() / 1000);
  fixed.uptime = parseInt(String(reportData.uptime)) || 0;

  return { success: true, data: fixed as unknown as VpsReportData };
}
