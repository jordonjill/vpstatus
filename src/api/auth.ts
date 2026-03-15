import type { Env, CorsHeadersLike } from '../types';
import { createApiResponse, createErrorResponse, createSuccessResponse } from '../utils/response';
import { parseJsonSafely } from '../utils/validation';
import { verifyPassword, hashPassword } from '../auth/password';
import { createJWT } from '../auth/jwt';
import { revokeToken } from '../auth/jwt';
import { authenticateRequest } from '../auth/middleware';
import { isUsingDefaultPassword } from '../auth/middleware';
import { checkLoginAttempts, recordLoginAttempt } from '../cache/rateLimit';
import { getSecurityConfig } from '../config';
import { handleDbError } from './utils';

async function getAdminCount(db: D1Database): Promise<number> {
  const row = await db.prepare('SELECT COUNT(*) as count FROM admin_credentials').first<{ count: number }>();
  return Number(row?.count || 0);
}

export async function handleAuthRoutes(
  path: string,
  method: string,
  request: Request,
  env: Env,
  corsHeaders: CorsHeadersLike,
  clientIP: string
): Promise<Response | null> {
  // Initial setup status
  if (path === '/api/auth/setup-required' && method === 'GET') {
    try {
      const adminCount = await getAdminCount(env.DB);
      return createApiResponse({ setupRequired: adminCount === 0 }, 200, corsHeaders);
    } catch (error) {
      return handleDbError(error, corsHeaders, 'setup status');
    }
  }

  // Initial setup: create first admin account
  if (path === '/api/auth/setup' && method === 'POST') {
    try {
      const adminCount = await getAdminCount(env.DB);
      if (adminCount > 0) {
        return createErrorResponse('Already initialized', 'Admin account already exists', 409, corsHeaders);
      }

      const body = await parseJsonSafely(request);
      const username = (body.username as string | undefined)?.trim() || '';
      const password = (body.password as string | undefined) || '';
      const confirmPassword = (body.confirm_password as string | undefined) || '';

      if (!username || !password) {
        return createErrorResponse('Missing fields', 'Username and password cannot be empty', 400, corsHeaders);
      }

      if (!/^[a-zA-Z0-9._-]{3,32}$/.test(username)) {
        return createErrorResponse(
          'Invalid username',
          'Username must be 3-32 chars and only contain letters, numbers, ., _, -',
          400,
          corsHeaders
        );
      }

      if (confirmPassword && password !== confirmPassword) {
        return createErrorResponse('Password mismatch', 'Passwords do not match', 400, corsHeaders);
      }

      const securityConfig = getSecurityConfig(env);
      if (password.length < securityConfig.MIN_PASSWORD_LENGTH) {
        return createErrorResponse(
          'Password too short',
          `Password must be at least ${securityConfig.MIN_PASSWORD_LENGTH} characters`,
          400,
          corsHeaders
        );
      }

      const passwordHash = await hashPassword(password);
      const now = Date.now();

      await env.DB.prepare(
        `
          INSERT INTO admin_credentials (username, password_hash, created_at, failed_attempts, must_change_password)
          VALUES (?, ?, ?, 0, 0)
        `
      )
        .bind(username, passwordHash, now)
        .run();

      const token = await createJWT({ username, usingDefaultPassword: false }, env);
      return createSuccessResponse(
        {
          setupCompleted: true,
          token,
          user: {
            username,
            usingDefaultPassword: false,
          },
        },
        corsHeaders
      );
    } catch (error) {
      return handleDbError(error, corsHeaders, 'initial setup');
    }
  }

  // Login handler
  if (path === '/api/auth/login' && method === 'POST') {
    try {
      const adminCount = await getAdminCount(env.DB);
      if (adminCount === 0) {
        return createErrorResponse(
          'Setup required',
          'No admin account exists yet. Please complete initial setup first.',
          428,
          corsHeaders
        );
      }

      if (!checkLoginAttempts(clientIP, env)) {
        return createErrorResponse('Too many login attempts', 'Too many login attempts, please try again in 15 minutes', 429, corsHeaders);
      }

      const body = await parseJsonSafely(request);
      const username = body.username as string;
      const password = body.password as string;

      if (!username || !password) {
        recordLoginAttempt(clientIP);
        return createErrorResponse('Missing credentials', 'Username and password cannot be empty', 400, corsHeaders);
      }

      const user = await env.DB.prepare(
        'SELECT username, password_hash, locked_until, failed_attempts FROM admin_credentials WHERE username = ?'
      )
        .bind(username)
        .first<{ username: string; password_hash: string; locked_until: number | null; failed_attempts: number }>();

      if (!user) {
        recordLoginAttempt(clientIP);
        return createErrorResponse('Invalid credentials', 'Invalid username or password', 401, corsHeaders);
      }

      if (user.locked_until && Date.now() < user.locked_until) {
        return createErrorResponse('Account locked', 'Account is locked, please try again later', 423, corsHeaders);
      }

      const isValidPassword = await verifyPassword(password, user.password_hash);
      if (!isValidPassword) {
        recordLoginAttempt(clientIP);

        const newFailedAttempts = (user.failed_attempts || 0) + 1;
        const config = getSecurityConfig(env);
        let lockedUntil: number | null = null;

        if (newFailedAttempts >= config.MAX_LOGIN_ATTEMPTS) {
          lockedUntil = Date.now() + config.LOGIN_ATTEMPT_WINDOW;
        }

        await env.DB.prepare(
          'UPDATE admin_credentials SET failed_attempts = ?, locked_until = ? WHERE username = ?'
        )
          .bind(newFailedAttempts, lockedUntil, username)
          .run();

        return createErrorResponse('Invalid credentials', 'Invalid username or password', 401, corsHeaders);
      }

      await env.DB.prepare(
        'UPDATE admin_credentials SET failed_attempts = 0, locked_until = NULL, last_login = ? WHERE username = ?'
      )
        .bind(Date.now(), username)
        .run();

      const usingDefault = isUsingDefaultPassword(username, password, env);
      const token = await createJWT({ username, usingDefaultPassword: usingDefault }, env);

      return createSuccessResponse(
        {
          token,
          user: { username, usingDefaultPassword: usingDefault },
        },
        corsHeaders
      );
    } catch (error) {
      return handleDbError(error, corsHeaders, 'login');
    }
  }

  // Authentication status check
  if (path === '/api/auth/status' && method === 'GET') {
    try {
      const adminCount = await getAdminCount(env.DB);
      const setupRequired = adminCount === 0;
      const user = await authenticateRequest(request, env);
      if (!user) {
        return createApiResponse({ authenticated: false, setupRequired }, 200, corsHeaders);
      }

      const dbUser = await env.DB.prepare(
        'SELECT username FROM admin_credentials WHERE username = ?'
      )
        .bind(user.username)
        .first<{ username: string }>();

      if (!dbUser) {
        return createApiResponse({ authenticated: false, setupRequired }, 200, corsHeaders);
      }

      return createApiResponse(
        {
          authenticated: true,
          setupRequired,
          user: {
            username: user.username,
            usingDefaultPassword: user.usingDefaultPassword || false,
          },
        },
        200,
        corsHeaders
      );
    } catch {
      return createApiResponse({ authenticated: false, setupRequired: false }, 200, corsHeaders);
    }
  }

  // Change password
  if (path === '/api/auth/change-password' && method === 'POST') {
    try {
      const user = await authenticateRequest(request, env);
      if (!user) {
        return createErrorResponse('Unauthorized', 'Login required', 401, corsHeaders);
      }

      const body = await parseJsonSafely(request);
      const currentPassword = body.current_password as string;
      const newPassword = body.new_password as string;

      if (!currentPassword || !newPassword) {
        return createErrorResponse('Missing fields', 'Current password and new password cannot be empty', 400, corsHeaders);
      }

      const config = getSecurityConfig(env);
      if (newPassword.length < config.MIN_PASSWORD_LENGTH) {
        return createErrorResponse(
          'Password too short',
          `Password must be at least ${config.MIN_PASSWORD_LENGTH} characters`,
          400,
          corsHeaders
        );
      }

      const dbUser = await env.DB.prepare(
        'SELECT password_hash FROM admin_credentials WHERE username = ?'
      )
        .bind(user.username)
        .first<{ password_hash: string }>();

      if (!dbUser || !(await verifyPassword(currentPassword, dbUser.password_hash))) {
        return createErrorResponse('Invalid current password', 'Current password is incorrect', 400, corsHeaders);
      }

      const newPasswordHash = await hashPassword(newPassword);
      await env.DB.prepare(
        'UPDATE admin_credentials SET password_hash = ?, password_changed_at = ?, must_change_password = 0 WHERE username = ?'
      )
        .bind(newPasswordHash, Date.now(), user.username)
        .run();

      const authHeader = request.headers.get('Authorization');
      if (authHeader?.startsWith('Bearer ')) {
        const currentToken = authHeader.substring(7);
        revokeToken(currentToken);
      }

      return createSuccessResponse(
        {
          message: 'Password changed successfully, please log in again',
          requireReauth: true,
        },
        corsHeaders
      );
    } catch (error) {
      return handleDbError(error, corsHeaders, 'change password');
    }
  }

  return null;
}
