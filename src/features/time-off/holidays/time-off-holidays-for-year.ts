import { dateKey } from '../../../type-safety/date-key';
import { isDate } from '../../../type-safety/is-date';

import { additionalTimeOffHolidays } from './additional-time-off-holidays';
import { easterSunday } from './easter-sunday';
import { fixedCzechHolidays } from './fixed-czech-holidays';
import type { TimeOffHoliday } from './time-off-holiday';

/** Actual holiday dates, with no substitute weekdays for holidays falling on weekends. */
export function timeOffHolidaysForYear(
  year: number,
  additionalHolidays: readonly TimeOffHoliday[] = additionalTimeOffHolidays,
): TimeOffHoliday[] {
  const easter = easterSunday(year);
  const goodFriday = new Date(year, easter.getMonth(), easter.getDate() - 2, 12);
  const easterMonday = new Date(year, easter.getMonth(), easter.getDate() + 1, 12);
  const yearKey = String(year).padStart(4, '0');
  return [
    ...fixedCzechHolidays.map(([day, name]) => ({ date: `${yearKey}-${day}`, name })),
    { date: dateKey(goodFriday), name: 'Good Friday' },
    { date: dateKey(easterMonday), name: 'Easter Monday' },
    ...additionalHolidays.filter((holiday) => isDate(holiday.date) && holiday.date.startsWith(`${yearKey}-`)),
  ].sort((first, second) => first.date.localeCompare(second.date));
}
