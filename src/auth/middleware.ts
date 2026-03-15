import type { Env, JWTPayload } from '../types';
import { getAdminConfig } from '../config';
import { verifyJWTCached } from './jwt';

export async function authenticateRequest(request: Request, env: Env): Promise<JWTPayload | null> {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;

  const token = authHeader.substring(7);
  const payload = await verifyJWTCached(token, env);
  if (!payload) return null;

  if (payload.shouldRefresh) {
    const user = await env.DB.prepare(
      'SELECT username, locked_until FROM admin_credentials WHERE username = ?'
    ).bind(payload.username).first<{ username: string; locked_until: number | null }>();

    if (!user || (user.locked_until && Date.now() < user.locked_until)) {
      return null;
    }
  }

  return payload;
}

export async function authenticateRequestOptional(request: Request, env: Env): Promise<JWTPayload | null> {
  try {
    return await authenticateRequest(request, env);
  } catch {
    return null;
  }
}

export async function authenticateAdmin(request: Request, env: Env): Promise<JWTPayload | null> {
  const user = await authenticateRequest(request, env);
  if (!user) return null;

  const adminUser = await env.DB.prepare(
    'SELECT username, locked_until FROM admin_credentials WHERE username = ?'
  ).bind(user.username).first<{ username: string; locked_until: number | null }>();

  if (!adminUser || (adminUser.locked_until && Date.now() < adminUser.locked_until)) {
    return null;
  }

  return user;
}

export function isUsingDefaultPassword(username: string, password: string, env: Env): boolean {
  const adminConfig = getAdminConfig(env);
  return username === adminConfig.USERNAME && password === adminConfig.PASSWORD;
}
