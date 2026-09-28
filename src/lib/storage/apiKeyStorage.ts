const OPENAI_STORAGE_KEY = 'jobify_openai_api_key';
const APIFY_STORAGE_KEY = 'jobify_apify_api_token';

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

export function getStoredApifyToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(APIFY_STORAGE_KEY);
}

export function setStoredApifyToken(token: string): void {
  if (typeof window === 'undefined') return;
  const trimmed = token.trim();
  if (trimmed) {
    localStorage.setItem(APIFY_STORAGE_KEY, trimmed);
  } else {
    localStorage.removeItem(APIFY_STORAGE_KEY);
  }
}

export function clearStoredApifyToken(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(APIFY_STORAGE_KEY);
}

export function isValidApifyTokenFormat(token: string): boolean {
  const trimmed = token.trim();
  return trimmed.startsWith('apify_api_') && trimmed.length >= 20;
}

export function getMaskedApifyToken(token: string | null): string {
  if (!token) return '';
  if (token.length <= 8) return '••••••••';
  return `${token.slice(0, 9)}••••••••${token.slice(-4)}`;
}
