import { dateKey } from '../../type-safety/date-key';

/** Local dates for a Monday-first month, preceded by empty weekday cells. */
export function monthDays(month: Date): (string | null)[] {
  const first = new Date(month.getFullYear(), month.getMonth(), 1, 12);
  const offset = (first.getDay() + 6) % 7;
  const count = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  return [
    ...Array<null>(offset).fill(null),
    ...Array.from({ length: count }, (_, index) =>
      dateKey(new Date(month.getFullYear(), month.getMonth(), index + 1, 12)),
    ),
  ];
}
