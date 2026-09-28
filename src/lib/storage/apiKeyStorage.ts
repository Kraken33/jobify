const OPENAI_STORAGE_KEY = 'jobify_openai_api_key';

export function getStoredApiKey(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(OPENAI_STORAGE_KEY);
}

export function setStoredApiKey(key: string): void {
  if (typeof window === 'undefined') return;
  const trimmed = key.trim();
  if (trimmed) {
    localStorage.setItem(OPENAI_STORAGE_KEY, trimmed);
  } else {
    localStorage.removeItem(OPENAI_STORAGE_KEY);
  }
}

export function clearStoredApiKey(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(OPENAI_STORAGE_KEY);
}

export function isValidKeyFormat(key: string): boolean {
  const trimmed = key.trim();
  return trimmed.startsWith('sk-') && trimmed.length >= 20;
}

export function getMaskedApiKey(key: string | null): string {
  if (!key) return '';
  if (key.length <= 8) return '••••••••';
  return `${key.slice(0, 3)}••••••••${key.slice(-4)}`;
}
