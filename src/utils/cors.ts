import type { Env, CorsHeadersLike } from '../types';
import { getSecurityConfig } from '../config';

export function getSecureCorsHeaders(origin: string | null, env: Env): CorsHeadersLike {
  const config = getSecurityConfig(env);
  const allowedOrigins = config.ALLOWED_ORIGINS;

  let allowedOrigin = 'null'; // Deny all cross-origin requests by default

  if (allowedOrigins.length > 0 && origin) {
    if (allowedOrigins.includes(origin)) {
      allowedOrigin = origin;
    } else {
      for (const allowed of allowedOrigins) {
        if (allowed.startsWith('*.')) {
          const domain = allowed.substring(2);
          if (origin === domain || origin.endsWith(`.${domain}`)) {
            allowedOrigin = origin;
            break;
          }
        }
      }
    }
  }

  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key',
    'Access-Control-Allow-Credentials': allowedOrigin !== 'null' ? 'true' : 'false',
    'Access-Control-Max-Age': '86400',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Content-Security-Policy':
      "default-src 'self'; script-src 'self' https://cdn.jsdelivr.net; style-src 'self' https://cdn.jsdelivr.net; img-src 'self' data: https:; font-src 'self' https://cdn.jsdelivr.net; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none';",
  };
}
