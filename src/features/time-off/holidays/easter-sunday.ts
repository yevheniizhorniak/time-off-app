/** Gregorian Easter Sunday, calculated with the Meeus/Jones/Butcher algorithm. */
export function easterSunday(year: number): Date {
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
