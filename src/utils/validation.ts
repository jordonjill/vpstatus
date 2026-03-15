// SQL security whitelist - prevents injection attacks
const SQL_WHITELIST: Record<string, string[]> = {
  column: ['id', 'name', 'url', 'description', 'sort_order', 'is_public', 'last_checked', 'last_status', 'timestamp', 'cpu', 'memory', 'disk', 'network', 'uptime'],
  table: ['servers', 'monitored_sites', 'metrics', 'site_status_history'],
  order: ['ASC', 'DESC'],
};

export function validateSqlIdentifier(value: string, type: 'column' | 'table' | 'order'): string {
  const allowed = SQL_WHITELIST[type];
  if (!allowed || !allowed.includes(value)) {
    throw new Error(`Invalid ${type}: ${value}`);
  }
  return value;
}

// Mask sensitive information
export function maskSensitive(value: string, type = 'key'): string {
  if (!value || typeof value !== 'string') return value;
  return type === 'key' && value.length > 8 ? value.substring(0, 8) + '***' : '***';
}

// Safe JSON parsing - size limited
export async function parseJsonSafely(request: Request, maxSize = 1024 * 1024): Promise<Record<string, unknown>> {
  const contentLength = request.headers.get('content-length');
  if (contentLength && parseInt(contentLength) > maxSize) {
    throw new Error('Request body too large');
  }

  const text = await request.text();
  if (text.length > maxSize) {
    throw new Error('Request body too large');
  }

  return JSON.parse(text) as Record<string, unknown>;
}

// HTTP/HTTPS URL validation
export function isValidHttpUrl(string: string): boolean {
  try {
    const url = new URL(string);
    return ['http:', 'https:'].includes(url.protocol);
  } catch {
    return false;
  }
}

// Enhanced input validation - fixes SSRF vulnerability
export function validateInput(input: unknown, type: string, maxLength = 255): boolean {
  if (!input || typeof input !== 'string' || input.length > maxLength) {
    return false;
  }

  const cleaned = input.trim();

  const validators: Record<string, () => boolean> = {
    serverName: () => {
      if (!/^[\w\s\u4e00-\u9fa5.-]{2,50}$/.test(cleaned)) return false;
      const sqlKeywords = ['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'DROP', 'SCRIPT', 'UNION', 'OR', 'AND'];
      return !sqlKeywords.some(keyword => cleaned.toUpperCase().includes(keyword));
    },
    description: () => {
      if (cleaned.length > 500) return false;
      return !/<[^>]*>|javascript:|on\w+\s*=|<script/i.test(cleaned);
    },
    direction: () => ['up', 'down'].includes(input),
    url: () => {
      try {
        const url = new URL(input);
        if (!['http:', 'https:'].includes(url.protocol)) return false;

        const hostname = url.hostname.toLowerCase();

        // IPv4 private network check
        if (
          hostname === 'localhost' ||
          hostname === '0.0.0.0' ||
          hostname.startsWith('127.') ||
          hostname.startsWith('10.') ||
          hostname.startsWith('192.168.') ||
          hostname.startsWith('169.254.') ||
          (hostname.startsWith('172.') &&
            parseInt(hostname.split('.')[1]) >= 16 &&
            parseInt(hostname.split('.')[1]) <= 31)
        ) {
          return false;
        }

        // IPv6 private network check
        if (hostname.includes(':')) {
          const cleanHostname = hostname.replace(/^\[|\]$/g, '');
          if (
            cleanHostname === '::1' ||
            cleanHostname.startsWith('fc') ||
            cleanHostname.startsWith('fd') ||
            cleanHostname.startsWith('fe80')
          ) {
            return false;
          }
        }

        // Domain blocklist check
        const blockedDomains = ['internal', 'local', 'intranet', 'corp'];
        if (blockedDomains.some(domain => hostname.includes(domain))) {
          return false;
        }

        // Port restriction
        const port = url.port;
        if (port && !['80', '443', '8080', '8443'].includes(port)) {
          return false;
        }

        return input.length <= 2048;
      } catch {
        return false;
      }
    },
  };

  return validators[type] ? validators[type]() : cleaned.length > 0;
}

// Path parameter validation
export function extractPathSegment(path: string, index: number): string | null {
  const segments = path.split('/');

  if (index < 0) {
    index = segments.length + index;
  }

  if (index < 0 || index >= segments.length) return null;

  const segment = segments[index];
  return segment && /^[a-zA-Z0-9_-]{1,50}$/.test(segment) ? segment : null;
}

// Convenience function to extract server ID
export function extractAndValidateServerId(path: string): string | null {
  return extractPathSegment(path, -1);
}
