import { expect, test } from 'vitest';

import {
  dateKey,
  employeeKey,
  isDate,
  monthDays,
  requestsOnDate,
  validateRequest,
  type RequestDraft,
  type TimeOffRequest,
} from './timeOff';

const draft: RequestDraft = { startDate: '2026-11-12', endDate: '2026-11-14', leaveType: 'paid-time-off', note: '' };
const request: TimeOffRequest = {
  ...draft,
  leaveType: 'paid-time-off',
  id: 'request-1',
  employeeKey: 'alex',
  employeeName: 'Alex',
  status: 'pending',
  createdAt: '2026-11-10T10:00:00Z',
};
const today = '2026-11-12';

test('allows today, one-day periods and all supported leave types', () => {
  for (const leaveType of ['paid-time-off', 'sick-day', 'parental-leave']) {
    expect(validateRequest({ ...draft, endDate: today, leaveType }, 'alex', [], today)).toEqual({});
  }
  expect(employeeKey('  ALex  ')).toBe('alex');
});

test('rejects missing or impossible dates, past dates, reversed periods and unknown leave types', () => {
  expect(validateRequest({ ...draft, startDate: '', endDate: '', leaveType: '' }, 'alex', [], today)).toMatchObject({
    startDate: expect.any(String),
    endDate: expect.any(String),
    leaveType: expect.any(String),
  });
  expect(isDate('2026-02-29')).toBe(false);
  expect(isDate('2028-02-29')).toBe(true);
  expect(isDate('2026-13-01')).toBe(false);
  expect(
    validateRequest({ ...draft, startDate: '2026-11-11', endDate: '2026-11-11' }, 'alex', [], today),
  ).toHaveProperty('startDate');
  expect(validateRequest({ ...draft, startDate: '2026-11-15' }, 'alex', [], today)).toHaveProperty('endDate');
});

test('prevents inclusive overlaps for pending and approved leave, including containment', () => {
  for (const status of ['pending', 'approved'] as const) {
    for (const [startDate, endDate] of [
      ['2026-11-14', '2026-11-15'],
      ['2026-11-12', '2026-11-12'],
      ['2026-11-12', '2026-11-20'],
      ['2026-11-13', '2026-11-13'],
    ]) {
      expect(validateRequest({ ...draft, startDate, endDate }, 'alex', [{ ...request, status }], today)).toHaveProperty(
        'startDate',
      );
    }
  }
  expect(
    validateRequest({ ...draft, startDate: '2026-11-15', endDate: '2026-11-15' }, 'alex', [request], today),
  ).toEqual({});
});

test('rejected requests release dates and another employee can request the same dates', () => {
  expect(validateRequest(draft, 'alex', [{ ...request, status: 'rejected' }], today)).toEqual({});
  expect(validateRequest(draft, 'bob', [request], today)).toEqual({});
  expect(requestsOnDate([request, { ...request, id: 'rejected', status: 'rejected' }], '2026-11-14')).toEqual([
    request,
  ]);
  expect(requestsOnDate([request], '2026-11-15')).toEqual([]);
});

test('builds Monday-first months across leap years and year boundaries using local dates', () => {
  const november = monthDays(new Date(2026, 10, 1, 12));
  expect(november.slice(0, 6)).toEqual(Array(6).fill(null));
  expect(november[6]).toBe('2026-11-01');
  expect(november.at(-1)).toBe('2026-11-30');
  expect(monthDays(new Date(2028, 1, 1, 12)).at(-1)).toBe('2028-02-29');
  expect(monthDays(new Date(2026, 12, 1, 12)).filter(Boolean)[0]).toBe('2027-01-01');
  expect(dateKey(new Date(2026, 0, 1, 0, 30))).toBe('2026-01-01');
});
