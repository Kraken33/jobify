import { addLogEntry } from './logStore';
import { sanitizeHeaders, sanitizeUrl } from './sanitizer';
import { HttpLogEntry } from './types';

export interface LoggedFetchOptions extends RequestInit {
  providerId?: string;
  fallbackUsed?: boolean;
}

export async function loggedFetch(
  input: string | URL | Request,
  init?: LoggedFetchOptions
): Promise<Response> {
  const startTime = Date.now();
  const rawUrl = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
  const method = (init?.method || (typeof input === 'object' && 'method' in input && input.method ? input.method : 'GET')).toUpperCase();
  const providerId = init?.providerId || 'http';
  const sanitizedUrl = sanitizeUrl(rawUrl);
  const sanitizedHeaders = sanitizeHeaders(init?.headers);

  try {
    const response = await fetch(input, init);
    const durationMs = Math.max(1, Date.now() - startTime);

    let error: string | undefined;
    if (!response.ok) {
      error = `HTTP ${response.status} ${response.statusText}`.trim();
    }

    addLogEntry({
      providerId,
      method,
      url: sanitizedUrl,
      durationMs,
      status: response.status,
      statusText: response.statusText,
      requestHeaders: sanitizedHeaders,
      error,
      fallbackUsed: init?.fallbackUsed,
    });

    return response;
  } catch (err: unknown) {
    const durationMs = Math.max(1, Date.now() - startTime);
    const errorMessage = err instanceof Error ? err.message : String(err);

    addLogEntry({
      providerId,
      method,
      url: sanitizedUrl,
      durationMs,
      requestHeaders: sanitizedHeaders,
      error: errorMessage,
      fallbackUsed: init?.fallbackUsed,
    });

    throw err;
  }
}

export function recordLogEntry(entry: Omit<HttpLogEntry, 'id' | 'timestamp'>): HttpLogEntry {
  return addLogEntry({
    ...entry,
    url: sanitizeUrl(entry.url),
    requestHeaders: sanitizeHeaders(entry.requestHeaders),
  });
}
