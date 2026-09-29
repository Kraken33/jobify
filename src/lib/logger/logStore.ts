import { HttpLogEntry, LogFilterOptions } from './types';

const DEFAULT_CAPACITY = 200;
let capacity = DEFAULT_CAPACITY;
let entries: HttpLogEntry[] = [];

function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `log_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function addLogEntry(
  entryInput: Omit<HttpLogEntry, 'id' | 'timestamp'> & { id?: string; timestamp?: string }
): HttpLogEntry {
  const entry: HttpLogEntry = {
    ...entryInput,
    id: entryInput.id || generateId(),
    timestamp: entryInput.timestamp || new Date().toISOString(),
  };

  entries.unshift(entry);

  if (entries.length > capacity) {
    entries.length = capacity;
  }

  return entry;
}

export function getLogEntries(options?: LogFilterOptions): HttpLogEntry[] {
  let result = [...entries];

  if (!options) {
    return result;
  }

  const { provider, statusCategory, search, limit } = options;

  if (provider && provider.trim() !== '' && provider !== 'all') {
    const p = provider.trim().toLowerCase();
    result = result.filter((e) => e.providerId.toLowerCase() === p);
  }

  if (statusCategory && statusCategory !== 'all') {
    if (statusCategory === 'success') {
      result = result.filter(
        (e) => (e.status !== undefined && e.status >= 200 && e.status < 300) && !e.error
      );
    } else if (statusCategory === 'error') {
      result = result.filter(
        (e) => (e.status !== undefined && e.status >= 400) || Boolean(e.error)
      );
    }
  }

  if (search && search.trim() !== '') {
    const q = search.trim().toLowerCase();
    result = result.filter(
      (e) =>
        e.url.toLowerCase().includes(q) ||
        e.providerId.toLowerCase().includes(q) ||
        e.method.toLowerCase().includes(q) ||
        (e.error && e.error.toLowerCase().includes(q)) ||
        (e.statusText && e.statusText.toLowerCase().includes(q))
    );
  }

  if (typeof limit === 'number' && limit > 0) {
    result = result.slice(0, limit);
  }

  return result;
}

export function clearLogEntries(): void {
  entries = [];
}

export function setLogStoreCapacity(newCapacity: number): void {
  if (newCapacity > 0) {
    capacity = newCapacity;
    if (entries.length > capacity) {
      entries.length = capacity;
    }
  }
}

export function getLogStoreStats(): { count: number; capacity: number } {
  return {
    count: entries.length,
    capacity,
  };
}
