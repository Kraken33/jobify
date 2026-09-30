/**
 * Formats a date string (ISO or timestamp) into a human-readable relative or calendar string:
 * - "Today" if published on the current calendar day
 * - "Yesterday" if published on the previous calendar day
 * - "DD.MM.YYYY" for earlier dates
 */
export function formatPublishedDate(dateStr?: string | null): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '';

  const now = new Date();
  const targetDay = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const oneDayMs = 24 * 60 * 60 * 1000;

  if (targetDay === today) {
    return 'Today';
  }
  if (targetDay === today - oneDayMs) {
    return 'Yesterday';
  }

  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}.${month}.${year}`;
}

/**
 * Normalizes a date string to midnight timestamp for day-bucket comparison.
 */
export function getDayTimestamp(dateStr?: string | null): number {
  if (!dateStr) return 0;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return 0;
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}
