const SENSITIVE_PARAM_NAMES = new Set([
  'token',
  'apikey',
  'api_key',
  'key',
  'secret',
  'password',
  'access_token',
  'auth',
  'authorization',
  'client_secret',
]);

const SENSITIVE_HEADER_PATTERNS = [
  /^authorization$/i,
  /^x-api-key$/i,
  /^x-openai-key$/i,
  /^x-apify-token$/i,
  /^api-key$/i,
  /^token$/i,
  /^cookie$/i,
  /^set-cookie$/i,
  /^proxy-authorization$/i,
  /secret/i,
  /password/i,
];

function isSensitiveParam(paramName: string): boolean {
  const normalized = paramName.toLowerCase().replace(/[-_]/g, '');
  if (SENSITIVE_PARAM_NAMES.has(paramName.toLowerCase())) return true;
  if (normalized.includes('token') || normalized.includes('secret') || normalized.includes('apikey') || normalized.includes('password')) {
    return true;
  }
  return false;
}

function isSensitiveHeader(headerName: string): boolean {
  return SENSITIVE_HEADER_PATTERNS.some((pattern) => pattern.test(headerName));
}

export function sanitizeUrl(rawUrl: string): string {
  if (!rawUrl) return rawUrl;

  try {
    const isAbsolute = /^https?:\/\//i.test(rawUrl);
    const parsed = new URL(rawUrl, isAbsolute ? undefined : 'http://localhost');

    let modified = false;
    for (const key of Array.from(parsed.searchParams.keys())) {
      if (isSensitiveParam(key)) {
        parsed.searchParams.set(key, '***');
        modified = true;
      }
    }

    if (!modified) {
      return rawUrl;
    }

    if (isAbsolute) {
      return parsed.toString();
    }

    // Relative URL: preserve original pathname + search
    return parsed.pathname + parsed.search + parsed.hash;
  } catch {
    // Fallback regex replacement for non-standard or malformed URLs
    return rawUrl.replace(/([?&](?:token|apiKey|api_key|key|secret|password)=)[^&]+/gi, '$1***');
  }
}

export function sanitizeHeaders(
  headers?: HeadersInit | Record<string, string | string[] | undefined> | null
): Record<string, string> {
  if (!headers) return {};

  const result: Record<string, string> = {};

  if (typeof Headers !== 'undefined' && headers instanceof Headers) {
    headers.forEach((value, key) => {
      if (isSensitiveHeader(key)) {
        if (value.toLowerCase().startsWith('bearer ')) {
          result[key] = 'Bearer ***';
        } else {
          result[key] = '***';
        }
      } else {
        result[key] = value;
      }
    });
    return result;
  }

  if (Array.isArray(headers)) {
    for (const [key, value] of headers) {
      if (isSensitiveHeader(key)) {
        if (typeof value === 'string' && value.toLowerCase().startsWith('bearer ')) {
          result[key] = 'Bearer ***';
        } else {
          result[key] = '***';
        }
      } else {
        result[key] = typeof value === 'string' ? value : String(value);
      }
    }
    return result;
  }

  if (typeof headers === 'object') {
    for (const [key, rawValue] of Object.entries(headers)) {
      if (rawValue === undefined || rawValue === null) continue;
      const value = Array.isArray(rawValue) ? rawValue.join(', ') : String(rawValue);

      if (isSensitiveHeader(key)) {
        if (value.toLowerCase().startsWith('bearer ')) {
          result[key] = 'Bearer ***';
        } else {
          result[key] = '***';
        }
      } else {
        result[key] = value;
      }
    }
  }

  return result;
}

export function truncateSnippet(content: unknown, maxLength = 1000): string {
  if (content === null || content === undefined) return '';

  let str = '';
  if (typeof content === 'string') {
    str = content;
  } else {
    try {
      str = JSON.stringify(content);
    } catch {
      str = String(content);
    }
  }

  if (str.length <= maxLength) {
    return str;
  }

  return `${str.slice(0, maxLength)}... [truncated]`;
}
