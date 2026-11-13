import { expect, test } from 'vitest';

import { isWeekend } from './is-weekend';
import { timeOffHolidayName } from './time-off-holiday-name';
import { timeOffHolidaysForYear } from './time-off-holidays-for-year';

test('includes all 13 Czech public holidays with English names', () => {
  expect(timeOffHolidaysForYear(2026)).toEqual([
    { date: '2026-01-01', name: "New Year's Day and Restoration of the Independent Czech State" },
    { date: '2026-04-03', name: 'Good Friday' },
    { date: '2026-04-06', name: 'Easter Monday' },
    { date: '2026-05-01', name: 'Labour Day' },
    { date: '2026-05-08', name: 'Victory Day' },
    { date: '2026-07-05', name: 'Saints Cyril and Methodius Day' },
    { date: '2026-07-06', name: 'Jan Hus Day' },
    { date: '2026-09-28', name: 'Czech Statehood Day' },
    { date: '2026-10-28', name: 'Independent Czechoslovak State Day' },
    { date: '2026-11-17', name: 'Freedom and Democracy Day and International Students’ Day' },
    { date: '2026-12-24', name: 'Christmas Eve' },
    { date: '2026-12-25', name: 'Christmas Day' },
    { date: '2026-12-26', name: "St. Stephen's Day" },
  ]);
});

test.each([
  ['2025-04-18', '2025-04-21'],
  ['2027-03-26', '2027-03-29'],
  ['2028-04-14', '2028-04-17'],
  ['2038-04-23', '2038-04-26'],
  ['2100-03-26', '2100-03-29'],
])('calculates movable holidays across years and centuries', (friday, monday) => {
  expect(timeOffHolidayName(friday)).toBe('Good Friday');
  expect(timeOffHolidayName(monday)).toBe('Easter Monday');
});

test('keeps weekend holidays on their dates and leaves ordinary weekdays available', () => {
  expect(isWeekend('2026-12-26')).toBe(true);
  expect(isWeekend('2026-12-27')).toBe(true);
  expect(timeOffHolidayName('2026-12-26')).toBe("St. Stephen's Day");
  expect(isWeekend('2026-12-28')).toBe(false);
  expect(timeOffHolidayName('2026-12-28')).toBeUndefined();
  expect(timeOffHolidayName('2026-11-16')).toBeUndefined();
  expect(timeOffHolidayName('2026-02-30')).toBeUndefined();
});

test('includes additional holidays for their year and combines names on shared dates', () => {
  const additional = Object.freeze([
    { date: '2026-11-16', name: 'Company holiday' },
    { date: '2026-12-24', name: 'Winter closure' },
    { date: '2027-11-16', name: 'Next year closure' },
  ]);
  expect(timeOffHolidaysForYear(2026, additional)).toHaveLength(15);
  expect(timeOffHolidayName('2026-11-16', additional)).toBe('Company holiday');
  expect(timeOffHolidayName('2026-12-24', additional)).toBe('Christmas Eve / Winter closure');
});
