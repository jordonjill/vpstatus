import type { Env, JWTPayload } from '../types';
import { getSecurityConfig } from '../config';

// JWT verification cache
const jwtCache = new Map<string, { payload: JWTPayload; timestamp: number }>();
const JWT_CACHE_TTL = 60000; // 1 minute cache
const MAX_CACHE_SIZE = 1000;

// Token revocation mechanism
const revokedTokens = new Map<string, number>();

export function revokeToken(token: string): void {
  revokedTokens.set(token, Date.now());
  jwtCache.delete(token);

  if (Math.random() < 0.01) {
    const expireTime = Date.now() - 24 * 60 * 60 * 1000;
    for (const [revokedToken, revokeTime] of revokedTokens.entries()) {
      if (revokeTime < expireTime) {
        revokedTokens.delete(revokedToken);
      }
    }
  }
}

export function isTokenRevoked(token: string): boolean {
  return revokedTokens.has(token);
}

export function cleanupJWTCache(): void {
  const now = Date.now();
  for (const [key, value] of jwtCache.entries()) {
    if (now - value.timestamp > JWT_CACHE_TTL) {
      jwtCache.delete(key);
    }
  }

  if (jwtCache.size > MAX_CACHE_SIZE) {
    const entries = Array.from(jwtCache.entries());
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
    const toDelete = entries.slice(0, jwtCache.size - MAX_CACHE_SIZE);
    toDelete.forEach(([key]) => jwtCache.delete(key));
  }
}

export async function createJWT(payload: Omit<JWTPayload, 'iat' | 'exp'>, env: Env): Promise<string> {
  const config = getSecurityConfig(env);
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Date.now();
  const jwtPayload: JWTPayload = { ...payload, iat: now, exp: now + config.TOKEN_EXPIRY } as JWTPayload;

  const encodedHeader = btoa(JSON.stringify(header));
  const encodedPayload = btoa(JSON.stringify(jwtPayload));
  const data = encodedHeader + '.' + encodedPayload;

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(config.JWT_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(data));
  const encodedSignature = btoa(String.fromCharCode(...new Uint8Array(signature)));

  return data + '.' + encodedSignature;
}

export async function verifyJWT(token: string, env: Env): Promise<JWTPayload | null> {
  try {
    if (isTokenRevoked(token)) return null;

    const config = getSecurityConfig(env);
    const [encodedHeader, encodedPayload, encodedSignature] = token.split('.');
    if (!encodedHeader || !encodedPayload || !encodedSignature) return null;

    const data = encodedHeader + '.' + encodedPayload;
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(config.JWT_SECRET),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );

    const signature = Uint8Array.from(atob(encodedSignature), c => c.charCodeAt(0));
    const isValid = await crypto.subtle.verify('HMAC', key, signature, encoder.encode(data));
    if (!isValid) return null;

    const payload = JSON.parse(atob(encodedPayload)) as JWTPayload;
    if (payload.exp && Date.now() > payload.exp) return null;

    const tokenAge = Date.now() - payload.iat;
    const halfLife = config.TOKEN_EXPIRY / 2;
    if (tokenAge > halfLife) {
      payload.shouldRefresh = true;
    }

    return payload;
  } catch {
    return null;
  }
}

export async function verifyJWTCached(token: string, env: Env): Promise<JWTPayload | null> {
  if (isTokenRevoked(token)) {
    jwtCache.delete(token);
    return null;
  }

  const cached = jwtCache.get(token);
  if (cached && Date.now() - cached.timestamp < JWT_CACHE_TTL) {
    if (cached.payload.exp && Date.now() > cached.payload.exp) {
      jwtCache.delete(token);
      return null;
    }
    if (isTokenRevoked(token)) {
      jwtCache.delete(token);
      return null;
    }
    return cached.payload;
  }

  const payload = await verifyJWT(token, env);
  if (payload && !isTokenRevoked(token)) {
    if (Math.random() < 0.01) {
      cleanupJWTCache();
    }

    jwtCache.set(token, {
      payload,
      timestamp: Date.now(),
    });
  }

  return payload;
}
