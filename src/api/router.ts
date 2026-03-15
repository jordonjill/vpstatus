import type { Env } from '../types';
import { getSecureCorsHeaders } from '../utils/cors';
import { createErrorResponse } from '../utils/response';
import { getClientIP, checkRateLimit } from '../cache/rateLimit';
import { handleAuthRoutes } from './auth';
import { handleServerRoutes } from './servers';
import { handleVpsRoutes } from './vps';
import { handleAdminRoutes } from './admin';

export async function handleApiRequest(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;
  const origin = request.headers.get('Origin');

  const corsHeaders = getSecureCorsHeaders(origin, env);

  // Handle CORS preflight requests
  if (method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  // Rate limit check
  const clientIP = getClientIP(request);
  if (!checkRateLimit(clientIP, path, env)) {
    return createErrorResponse('Too many requests', 'Too many requests, please try again later', 429, corsHeaders);
  }

  // Route priority: auth > admin > servers > vps > 404

  // Auth routes
  const authResponse = await handleAuthRoutes(path, method, request, env, corsHeaders, clientIP);
  if (authResponse) return authResponse;

  // Server management routes
  const serverResponse = await handleServerRoutes(path, method, request, env, corsHeaders);
  if (serverResponse) return serverResponse;

  // VPS monitoring routes
  const vpsResponse = await handleVpsRoutes(path, method, request, env, corsHeaders, ctx);
  if (vpsResponse) return vpsResponse;

  // Admin routes (sites, background settings, etc.)
  const adminResponse = await handleAdminRoutes(path, method, request, env, corsHeaders, ctx);
  if (adminResponse) return adminResponse;

  // No matching API route found
  return new Response(JSON.stringify({ error: 'API endpoint not found' }), {
    status: 404,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  });
}
