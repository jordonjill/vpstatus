import type { Env, BatchReportItem, VpsReportData } from '../types';

const TWELVE_HOURS_SECONDS = 12 * 60 * 60; // 43200 seconds

// VPS data batch processor
export class VpsBatchProcessor {
  private batchBuffer: BatchReportItem[] = [];
  private lastBatch: number = Math.floor(Date.now() / 1000);
  private readonly maxBatchSize = 100;

  addReport(serverId: string, reportData: VpsReportData, batchInterval: number): boolean {
    this.batchBuffer.push({
      serverId,
      timestamp: reportData.timestamp,
      cpu: JSON.stringify(reportData.cpu),
      memory: JSON.stringify(reportData.memory),
      disk: JSON.stringify(reportData.disk),
      network: JSON.stringify(reportData.network),
      uptime: reportData.uptime,
    });

    const now = Math.floor(Date.now() / 1000);
    if (now - this.lastBatch >= batchInterval || this.batchBuffer.length >= this.maxBatchSize) {
      return true;
    }
    return false;
  }

  getBatchData(): BatchReportItem[] {
    const data = [...this.batchBuffer];
    this.batchBuffer = [];
    this.lastBatch = Math.floor(Date.now() / 1000);
    return data;
  }

  shouldFlush(batchInterval: number): boolean {
    const now = Math.floor(Date.now() / 1000);
    return this.batchBuffer.length > 0 && now - this.lastBatch >= batchInterval;
  }
}

// Global batch processor instance
export const vpsBatchProcessor = new VpsBatchProcessor();

// Batch write VPS data to database
export async function flushVpsBatchData(env: Env): Promise<void> {
  const batchData = vpsBatchProcessor.getBatchData();
  if (batchData.length === 0) return;

  try {
    const twelveHoursAgo = Math.floor(Date.now() / 1000) - TWELVE_HOURS_SECONDS;

    const statements = batchData.flatMap(report => [
      env.DB.prepare(`
        REPLACE INTO metrics (server_id, timestamp, cpu, memory, disk, network, uptime)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).bind(
        report.serverId,
        report.timestamp,
        report.cpu,
        report.memory,
        report.disk,
        report.network,
        report.uptime
      ),
      env.DB.prepare(`
        INSERT INTO metrics_history (server_id, timestamp, cpu, memory, disk, network, uptime)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).bind(
        report.serverId,
        report.timestamp,
        report.cpu,
        report.memory,
        report.disk,
        report.network,
        report.uptime
      ),
    ]);

    // Append cleanup of old metrics_history entries
    statements.push(
      env.DB.prepare('DELETE FROM metrics_history WHERE timestamp < ?').bind(twelveHoursAgo)
    );

    await env.DB.batch(statements);
    console.log(`Batch wrote ${batchData.length} VPS data records`);
  } catch (error) {
    console.error('Batch write VPS data failed:', error);
    // Re-add data to the buffer
    vpsBatchProcessor['batchBuffer'].unshift(...batchData);
    throw error;
  }
}

// Scheduled flush of VPS batch data
export async function scheduleVpsBatchFlush(env: Env, ctx: ExecutionContext, getInterval: () => Promise<number>): Promise<void> {
  try {
    const batchInterval = await getInterval();
    if (vpsBatchProcessor.shouldFlush(batchInterval)) {
      ctx.waitUntil(flushVpsBatchData(env));
    }
  } catch {
    if (vpsBatchProcessor.shouldFlush(60)) {
      ctx.waitUntil(flushVpsBatchData(env));
    }
  }
}
