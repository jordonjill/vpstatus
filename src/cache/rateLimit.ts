import type { Env } from '../types';
import { getSecurityConfig } from '../config';

const rateLimitStore = new Map<string, number[]>();
const loginAttemptStore = new Map<string, number[]>();

export function checkRateLimit(clientIP: string, endpoint: string, env: Env): boolean {
  const config = getSecurityConfig(env);
  const key = `${clientIP}:${endpoint}`;
  const now = Date.now();
  const windowStart = now - 60000;

  if (!rateLimitStore.has(key)) {
    rateLimitStore.set(key, []);
  }

  const requests = rateLimitStore.get(key)!;
  const validRequests = requests.filter(timestamp => timestamp > windowStart);

  if (validRequests.length >= config.API_RATE_LIMIT) {
    return false;
  }

  validRequests.push(now);
  rateLimitStore.set(key, validRequests);
  return true;
}

export function checkLoginAttempts(clientIP: string, env: Env): boolean {
  const config = getSecurityConfig(env);
  const now = Date.now();
  const windowStart = now - config.LOGIN_ATTEMPT_WINDOW;

  if (!loginAttemptStore.has(clientIP)) {
    loginAttemptStore.set(clientIP, []);
  }

  const attempts = loginAttemptStore.get(clientIP)!;
  const validAttempts = attempts.filter(timestamp => timestamp > windowStart);
  return validAttempts.length < config.MAX_LOGIN_ATTEMPTS;
}

export function recordLoginAttempt(clientIP: string): void {
  const now = Date.now();
  if (!loginAttemptStore.has(clientIP)) {
    loginAttemptStore.set(clientIP, []);
  }
  loginAttemptStore.get(clientIP)!.push(now);
}

export function getClientIP(request: Request): string {
  return (
    request.headers.get('CF-Connecting-IP') ||
    request.headers.get('X-Forwarded-For') ||
    request.headers.get('X-Real-IP') ||
    '127.0.0.1'
  );
}
