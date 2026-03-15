import type { Env, AdminConfig, SecurityConfig } from './types';

export function getAdminConfig(env: Env): AdminConfig {
  return {
    USERNAME: env.USERNAME || '',
    PASSWORD: env.PASSWORD || '',
  };
}

export function getSecurityConfig(env: Env): SecurityConfig {
  if (!env.JWT_SECRET || env.JWT_SECRET === 'default-jwt-secret-please-set-in-worker-variables') {
    throw new Error('JWT_SECRET must be set in environment variables for security');
  }

  return {
    JWT_SECRET: env.JWT_SECRET,
    TOKEN_EXPIRY: 2 * 60 * 60 * 1000, // 2 hours
    MAX_LOGIN_ATTEMPTS: 5,
    LOGIN_ATTEMPT_WINDOW: 15 * 60 * 1000, // 15 minutes
    API_RATE_LIMIT: 60, // 60 requests per minute
    MIN_PASSWORD_LENGTH: 8,
    ALLOWED_ORIGINS: env.ALLOWED_ORIGINS ? env.ALLOWED_ORIGINS.split(',').map(o => o.trim()) : [],
  };
}
