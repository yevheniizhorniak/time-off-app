import { expect, test } from 'vitest';

import { dateKey } from '../../type-safety/date-key';

import { createDemoTimeOffRequests } from './demo-time-off-requests';
import { isWeekend } from './holidays/is-weekend';
import { timeOffHolidaysForYear } from './holidays/time-off-holidays-for-year';
import { isTimeOffRequest } from './types/time-off-request';

test.each(['2026-11-12', '2027-01-03', '2026-03-27'])('creates valid examples relative to %s', (day) => {
  const today = new Date(`${day}T12:00:00`);
  const original = today.getTime();
  const examples = createDemoTimeOffRequests(today);
  expect(today.getTime()).toBe(original);
  expect(examples).toHaveLength(3);
  expect(new Set(examples.map(({ id }) => id)).size).toBe(3);
  expect(examples.map(({ status }) => status)).toEqual(['approved', 'rejected', 'pending']);
  for (const example of examples) {
    expect(isTimeOffRequest(example)).toBe(true);
    expect(example.employeeKey).toBe('testusr');
    expect(example.startDate).toBe(example.endDate);
    expect(isWeekend(example.startDate)).toBe(false);
    expect(timeOffHolidaysForYear(Number(example.startDate.slice(0, 4))).map(({ date }) => date)).not.toContain(
      example.startDate,
    );
    expect(dateKey(new Date(example.createdAt)) < example.startDate).toBe(true);
    if (example.status === 'pending') {
      expect(example.startDate > day).toBe(true);
      expect(new Date(example.createdAt).getTime()).toBeLessThan(today.getTime());
      expect(example.reviewedAt).toBeUndefined();
    } else {
      expect(example.endDate < day).toBe(true);
      expect(new Date(example.reviewedAt!).getTime()).toBeGreaterThan(new Date(example.createdAt).getTime());
      expect(dateKey(new Date(example.reviewedAt!)) < example.startDate).toBe(true);
    }
  }
});

test.each([
  ['2026-11-12', ['2026-10-23', '2026-11-02', '2026-11-18']],
  ['2027-01-03', ['2026-12-14', '2026-12-23', '2027-01-08']],
  ['2026-03-27', ['2026-03-06', '2026-03-17', '2026-04-01']],
])('selects the nearest allowed dates for %s', (day, expected) => {
  expect(createDemoTimeOffRequests(new Date(`${day}T12:00:00`)).map(({ startDate }) => startDate)).toEqual(expected);
});
