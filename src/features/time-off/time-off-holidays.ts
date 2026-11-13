import { dateKey, isDate } from '../../dates/calendar-dates';

export type TimeOffHoliday = {
  date: string;
  name: string;
};

/** Organization-specific holidays, using local YYYY-MM-DD dates and English names. */
export const additionalTimeOffHolidays: readonly TimeOffHoliday[] = [];

// Czech public holidays, https://www.cnb.cz/en/public/media-service/schedules-and-other-info/bank-holidays-in-the-czech-republic/
const fixedCzechHolidays = [
  ['01-01', "New Year's Day and Restoration of the Independent Czech State"],
  ['05-01', 'Labour Day'],
  ['05-08', 'Victory Day'],
  ['07-05', 'Saints Cyril and Methodius Day'],
  ['07-06', 'Jan Hus Day'],
  ['09-28', 'Czech Statehood Day'],
  ['10-28', 'Independent Czechoslovak State Day'],
  ['11-17', 'Freedom and Democracy Day and International Students’ Day'],
  ['12-24', 'Christmas Eve'],
  ['12-25', 'Christmas Day'],
  ['12-26', "St. Stephen's Day"],
] as const;

/** Gregorian Easter Sunday, calculated with the Meeus/Jones/Butcher algorithm. */
function easterSunday(year: number): Date {
  const goldenNumber = year % 19;
  const century = Math.floor(year / 100);
  const yearInCentury = year % 100;
  const centuryLeapYears = Math.floor(century / 4);
  const centuryRemainder = century % 4;
  const solarCorrection = Math.floor((century + 8) / 25);
  const lunarCorrection = Math.floor((century - solarCorrection + 1) / 3);
  const epact = (19 * goldenNumber + century - centuryLeapYears - lunarCorrection + 15) % 30;
  const leapYears = Math.floor(yearInCentury / 4);
  const yearRemainder = yearInCentury % 4;
  const weekdayCorrection = (32 + 2 * centuryRemainder + 2 * leapYears - epact - yearRemainder) % 7;
  const correction = Math.floor((goldenNumber + 11 * epact + 22 * weekdayCorrection) / 451);
  const monthAndDay = epact + weekdayCorrection - 7 * correction + 114;
  return new Date(year, Math.floor(monthAndDay / 31) - 1, (monthAndDay % 31) + 1, 12);
}

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

export function isWeekend(date: string): boolean {
  const weekday = new Date(`${date}T12:00:00`).getDay();
  return weekday === 0 || weekday === 6;
}
