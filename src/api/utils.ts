import type { CorsHeadersLike } from '../types';
import { createErrorResponse } from '../utils/response';

export function handleDbError(error: unknown, corsHeaders: CorsHeadersLike, operation = 'database operation'): Response {
  if (error instanceof Error && error.message.includes('no such table')) {
    return createErrorResponse('Database table missing', 'Database table does not exist, please retry', 503, corsHeaders);
  }

  return createErrorResponse(
    'Internal server error',
    `${operation} failed: ${error instanceof Error ? error.message : 'unknown error'}`,
    500,
    corsHeaders
  );
}
