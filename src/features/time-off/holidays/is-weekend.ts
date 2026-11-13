export function isWeekend(date: string): boolean {
  const weekday = new Date(`${date}T12:00:00`).getDay();
  return weekday === 0 || weekday === 6;
}
