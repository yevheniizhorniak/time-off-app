/**
 * Returns a `YYYY-MM-DD` key for matching and comparing calendar days.
 * Uses the local timezone and defaults to today.
 */
export function dateKey(date = new Date()): string {
  return `${String(date.getFullYear()).padStart(4, '0')}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
