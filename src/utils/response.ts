import type { CorsHeadersLike } from '../types';

export function createApiResponse(data: unknown, status = 200, corsHeaders: CorsHeadersLike = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  });
}

export function createErrorResponse(
  error: string,
  message: string,
  status = 500,
  corsHeaders: CorsHeadersLike = {},
  details: string | null = null
): Response {
  const errorData: Record<string, unknown> = {
    error,
    message,
    timestamp: Date.now(),
  };
  if (details) errorData.details = details;

  return createApiResponse(errorData, status, corsHeaders);
}

export function createSuccessResponse(data: Record<string, unknown>, corsHeaders: CorsHeadersLike = {}): Response {
  return createApiResponse({ success: true, ...data }, 200, corsHeaders);
}
