// TypeScript interfaces and type definitions for vps-status

export interface Env {
  DB: D1Database;
  JWT_SECRET: string;
  USERNAME?: string;
  PASSWORD?: string;
  ALLOWED_ORIGINS?: string;
}

export interface AdminConfig {
  USERNAME: string;
  PASSWORD: string;
}

export interface SecurityConfig {
  JWT_SECRET: string;
  TOKEN_EXPIRY: number;
  MAX_LOGIN_ATTEMPTS: number;
  LOGIN_ATTEMPT_WINDOW: number;
  API_RATE_LIMIT: number;
  MIN_PASSWORD_LENGTH: number;
  ALLOWED_ORIGINS: string[];
}

export interface JWTPayload {
  username: string;
  usingDefaultPassword?: boolean;
  iat: number;
  exp: number;
  shouldRefresh?: boolean;
}

export interface CpuMetrics {
  usage_percent: number;
  load_avg?: number[];
}

export interface MemoryMetrics {
  total: number;
  used: number;
  free: number;
  usage_percent: number;
}

export interface DiskMetrics {
  total: number;
  used: number;
  free: number;
  usage_percent: number;
}

export interface NetworkMetrics {
  upload_speed: number;
  download_speed: number;
  total_upload: number;
  total_download: number;
}

export interface VpsReportData {
  timestamp: number;
  cpu: CpuMetrics;
  memory: MemoryMetrics;
  disk: DiskMetrics;
  network: NetworkMetrics;
  uptime: number;
}

export interface ServerRecord {
  id: string;
  name: string;
  description?: string;
  api_key?: string;
  created_at: number;
  sort_order?: number | null;
  is_public?: number;
  last_report?: number | null;
}

export interface MetricsRecord {
  server_id: string;
  timestamp: number;
  cpu: string;
  memory: string;
  disk: string;
  network: string;
  uptime: number;
}

export interface MonitoredSiteRecord {
  id: string;
  url: string;
  name?: string;
  added_at: number;
  last_checked?: number | null;
  last_status: string;
  last_status_code?: number | null;
  last_response_time_ms?: number | null;
  sort_order?: number | null;
  is_public?: number;
  history?: SiteHistoryRecord[];
}

export interface SiteHistoryRecord {
  timestamp: number;
  status: string;
  status_code?: number | null;
  response_time_ms?: number | null;
}

export interface AdminCredential {
  username: string;
  password_hash: string;
  created_at: number;
  last_login?: number | null;
  failed_attempts: number;
  locked_until?: number | null;
  must_change_password: number;
  password_changed_at?: number | null;
}

export interface CorsHeaders {
  'Access-Control-Allow-Origin': string;
  'Access-Control-Allow-Methods': string;
  'Access-Control-Allow-Headers': string;
  'Access-Control-Allow-Credentials': string;
  'Access-Control-Max-Age': string;
  'X-Content-Type-Options': string;
  'X-Frame-Options': string;
  'X-XSS-Protection': string;
  'Referrer-Policy': string;
  'Content-Security-Policy': string;
}

export type CorsHeadersLike = Record<string, string>;

export interface ApiErrorResponse {
  error: string;
  message: string;
  timestamp: number;
  details?: string;
}

export interface ApiSuccessResponse {
  success: true;
  [key: string]: unknown;
}

export interface ServerAuthResult {
  success?: true;
  error?: string;
  message?: string;
  serverId?: string;
  serverData?: ServerRecord;
}

export interface VpsValidationResult {
  success?: true;
  error?: string;
  message?: string;
  details?: string;
  data?: VpsReportData;
}

export interface BatchReportItem {
  serverId: string;
  timestamp: number;
  cpu: string;
  memory: string;
  disk: string;
  network: string;
  uptime: number;
}

export interface CacheEntry<T> {
  value: T;
  timestamp: number;
  ttl: number;
}

export interface AppConfigRow {
  key: string;
  value: string;
}
