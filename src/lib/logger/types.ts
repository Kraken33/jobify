export interface HttpLogEntry {
  id: string;
  timestamp: string;
  providerId: string;
  method: string;
  url: string;
  durationMs: number;
  status?: number;
  statusText?: string;
  requestHeaders?: Record<string, string>;
  responseSnippet?: string;
  error?: string;
  fallbackUsed?: boolean;
}

export interface LogFilterOptions {
  provider?: string;
  statusCategory?: 'all' | 'success' | 'error';
  search?: string;
  limit?: number;
}
