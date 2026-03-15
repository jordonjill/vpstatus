import type { Env, CacheEntry, AppConfigRow, ServerRecord } from '../types';

export class ConfigCache {
  private cache = new Map<string, CacheEntry<unknown>>();
  private readonly CACHE_TTL = {
    MONITORING: 5 * 60 * 1000, // 5 minutes
    SERVERS: 2 * 60 * 1000,    // 2 minutes
  };

  set<T>(key: string, value: T, ttl: number): void {
    this.cache.set(key, {
      value,
      timestamp: Date.now(),
      ttl,
    });
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.value as T;
  }

  async getMonitoringSettings(db: D1Database): Promise<AppConfigRow[]> {
    const cached = this.get<AppConfigRow[]>('monitoring_settings');
    if (cached) return cached;

    const settings = await db.prepare(
      'SELECT * FROM app_config WHERE key IN ("vps_report_interval", "site_check_interval")'
    ).all<AppConfigRow>();

    if (settings?.results) {
      this.set('monitoring_settings', settings.results, this.CACHE_TTL.MONITORING);
      return settings.results;
    }

    return [];
  }

  async getServerList(db: D1Database, isAdmin = false): Promise<ServerRecord[]> {
    const cacheKey = isAdmin ? 'servers_admin' : 'servers_public';
    const cached = this.get<ServerRecord[]>(cacheKey);
    if (cached) return cached;

    let query = 'SELECT id, name, description FROM servers';
    if (!isAdmin) {
      query += ' WHERE is_public = 1';
    }
    query += ' ORDER BY sort_order ASC NULLS LAST, name ASC';

    const { results } = await db.prepare(query).all<ServerRecord>();
    const servers = results || [];

    this.set(cacheKey, servers, this.CACHE_TTL.SERVERS);
    return servers;
  }

  clear(): void {
    this.cache.clear();
  }

  clearKey(key: string): void {
    this.cache.delete(key);
  }
}

// Global config cache instance
export const configCache = new ConfigCache();
