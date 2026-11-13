import { isDate } from '../../../type-safety/is-date';

import { additionalTimeOffHolidays } from './additional-time-off-holidays';
import type { TimeOffHoliday } from './time-off-holiday';
import { timeOffHolidaysForYear } from './time-off-holidays-for-year';

/** Holiday names for a valid local date, including additional configured holidays. */
export function timeOffHolidayName(
  date: string,
  additionalHolidays: readonly TimeOffHoliday[] = additionalTimeOffHolidays,
): string | undefined {
  if (!isDate(date)) return undefined;
  const names = timeOffHolidaysForYear(Number(date.slice(0, 4)), additionalHolidays)
    .filter((holiday) => holiday.date === date)
    .map((holiday) => holiday.name);
  return names.length > 0 ? names.join(' / ') : undefined;
}
