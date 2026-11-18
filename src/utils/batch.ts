import type { Env, BatchReportItem, VpsReportData } from '../types';

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
    // WHERE EXISTS skips reports for servers deleted while their data sat in the buffer;
    // otherwise the FK violation fails the whole batch, which is then re-queued forever.
    const statements = batchData.flatMap(report => [
      env.DB.prepare(`
        REPLACE INTO metrics (server_id, timestamp, cpu, memory, disk, network, uptime)
        SELECT ?1, ?2, ?3, ?4, ?5, ?6, ?7 WHERE EXISTS (SELECT 1 FROM servers WHERE id = ?1)
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
        SELECT ?1, ?2, ?3, ?4, ?5, ?6, ?7 WHERE EXISTS (SELECT 1 FROM servers WHERE id = ?1)
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

    // Old metrics_history rows are pruned hourly by performDatabaseMaintenance; deleting
    // here scanned the whole table on every flush (~2M rows read per day).
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
