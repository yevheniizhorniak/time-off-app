export function formatDate(value: string): string {
  return new Date(`${value}T12:00:00`).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}
