import { afterEach, expect, test, vi } from 'vitest';

import type { Session } from '../auth/session-domain';

import {
  createTimeOffRequest,
  dateKey,
  isDate,
  monthDays,
  RequestDecisionError,
  RequestValidationError,
  requestsOnDate,
  reviewTimeOffRequest,
  validateRequest,
  type RequestDraft,
  type TimeOffRequest,
} from './time-off-domain';
import * as timeOffHolidays from './time-off-holidays';

const draft: RequestDraft = { startDate: '2026-11-12', endDate: '2026-11-13', leaveType: 'paid-time-off', note: '' };
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
const employee: Extract<Session, { role: 'employee' }> = { role: 'employee', name: 'Alex', employeeKey: 'alex' };
const metadata = { id: 'new-request', createdAt: '2026-11-12T10:00:00Z', today };

afterEach(() => {
  vi.restoreAllMocks();
});

test('creates a pending request with explicit metadata and trims notes without mutating the draft', () => {
  const input = Object.freeze({ ...draft, note: '  Family trip  ' });
  const created = createTimeOffRequest(input, employee, Object.freeze([]), metadata);
  expect(created).toEqual({
    ...input,
    note: 'Family trip',
    id: metadata.id,
    createdAt: metadata.createdAt,
    employeeKey: 'alex',
    employeeName: 'Alex',
    status: 'pending',
  });
  expect(input.note).toBe('  Family trip  ');
});

test('creation rejects invalid drafts and overlaps with the supplied current requests', () => {
  expect(() => createTimeOffRequest({ ...draft, leaveType: 'unknown' }, employee, [], metadata)).toThrow(
    RequestValidationError,
  );
  expect(() => createTimeOffRequest(draft, employee, [request], metadata)).toThrow(RequestValidationError);
});

test.each(['approved', 'rejected'] as const)('reviews pending requests as %s without mutating inputs', (status) => {
  const other = Object.freeze({ ...request, id: 'other' });
  const current = Object.freeze([Object.freeze({ ...request }), other]);
  const reviewedAt = '2026-11-12T11:00:00Z';
  const reviewed = reviewTimeOffRequest(current, request.id, status, '  Decision note  ', reviewedAt);
  expect(reviewed[0]).toEqual({ ...request, status, reviewerNote: 'Decision note', reviewedAt });
  expect(reviewed[1]).toBe(other);
  expect(current[0].status).toBe('pending');
});

test('review rejects missing and already-reviewed requests with a typed decision error', () => {
  const reviewedAt = '2026-11-12T11:00:00Z';
  expect(() => reviewTimeOffRequest([request], 'missing', 'approved', '', reviewedAt)).toThrow(RequestDecisionError);
  for (const status of ['approved', 'rejected'] as const) {
    expect(() =>
      reviewTimeOffRequest([{ ...request, status, reviewedAt }], request.id, 'approved', '', reviewedAt),
    ).toThrow(RequestDecisionError);
  }
});

test('allows today, one-day periods and all supported leave types', () => {
  for (const leaveType of ['paid-time-off', 'sick-day', 'parental-leave']) {
    expect(validateRequest({ ...draft, endDate: today, leaveType }, 'alex', [], today)).toEqual({});
  }
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
  expect(validateRequest({ ...draft, startDate: '2026-11-16' }, 'alex', [], today)).toHaveProperty('endDate');
});

test('prevents inclusive overlaps for pending and approved leave, including containment', () => {
  for (const status of ['pending', 'approved'] as const) {
    for (const [startDate, endDate] of [
      ['2026-11-13', '2026-11-16'],
      ['2026-11-12', '2026-11-12'],
      ['2026-11-12', '2026-11-20'],
      ['2026-11-13', '2026-11-13'],
    ]) {
      expect(validateRequest({ ...draft, startDate, endDate }, 'alex', [{ ...request, status }], today)).toHaveProperty(
        'startDate',
        'These dates overlap one of your pending or approved requests.',
      );
    }
  }
  expect(
    validateRequest({ ...draft, startDate: '2026-11-16', endDate: '2026-11-16' }, 'alex', [request], today),
  ).toEqual({});
});

test('rejected requests release dates and another employee can request the same dates', () => {
  expect(validateRequest(draft, 'alex', [{ ...request, status: 'rejected' }], today)).toEqual({});
  expect(validateRequest(draft, 'bob', [request], today)).toEqual({});
  expect(requestsOnDate([request, { ...request, id: 'rejected', status: 'rejected' }], '2026-11-13')).toEqual([
    request,
  ]);
  expect(requestsOnDate([request], '2026-11-15')).toEqual([]);
});

test.each(['2026-11-14', '2026-11-15', '2026-11-17', '2027-03-26', '2027-03-29'])(
  'rejects unavailable endpoints on %s through validation and creation',
  (date) => {
    const errors = validateRequest({ ...draft, startDate: date, endDate: date }, 'alex', [], today);
    expect(errors.startDate).toMatch(/Start date (must be a weekday|cannot be a public holiday)/);
    expect(errors.endDate).toMatch(/End date (must be a weekday|cannot be a public holiday)/);
    for (const input of [
      { ...draft, startDate: date, endDate: '2027-04-01' },
      { ...draft, endDate: date },
    ]) {
      expect(() => createTimeOffRequest(input, employee, [], metadata)).toThrow(RequestValidationError);
    }
  },
);

test('allows ranges spanning weekends and holidays for every leave type', () => {
  for (const leaveType of ['paid-time-off', 'sick-day', 'parental-leave']) {
    const spanning = { ...draft, startDate: '2026-11-13', endDate: '2026-11-18', leaveType };
    expect(validateRequest(spanning, 'alex', [], today)).toEqual({});
    expect(createTimeOffRequest(spanning, employee, [], metadata)).toMatchObject(spanning);
  }
});

test.each(['pending', 'approved'] as const)('counts only working days in %s request ranges', (status) => {
  for (const { startDate, endDate, excluded, included } of [
    {
      startDate: '2026-11-13',
      endDate: '2026-11-18',
      excluded: ['2026-11-14', '2026-11-15', '2026-11-17'],
      included: ['2026-11-13', '2026-11-16', '2026-11-18'],
    },
    {
      startDate: '2026-12-23',
      endDate: '2026-12-28',
      excluded: ['2026-12-24', '2026-12-25', '2026-12-26', '2026-12-27'],
      included: ['2026-12-23', '2026-12-28'],
    },
    {
      startDate: '2027-03-25',
      endDate: '2027-03-30',
      excluded: ['2027-03-26', '2027-03-27', '2027-03-28', '2027-03-29'],
      included: ['2027-03-25', '2027-03-30'],
    },
  ]) {
    const saved = Object.freeze({ ...request, startDate, endDate, status });
    const rejected = { ...saved, id: 'rejected', status: 'rejected' as const };
    for (const date of excluded) expect(requestsOnDate([saved, rejected], date)).toEqual([]);
    for (const date of included) expect(requestsOnDate([saved, rejected], date)).toEqual([saved]);
  }
});

test('excludes additional configured holidays from pending and approved coverage', () => {
  const lookup = timeOffHolidays.timeOffHolidayName;
  vi.spyOn(timeOffHolidays, 'timeOffHolidayName').mockImplementation((date) =>
    lookup(date, [{ date: '2026-11-16', name: 'Company holiday' }]),
  );
  const saved = [
    { ...request, endDate: '2026-11-18' },
    { ...request, id: 'approved', status: 'approved' as const, endDate: '2026-11-18' },
  ];
  expect(requestsOnDate(saved, '2026-11-16')).toEqual([]);
  expect(requestsOnDate(saved, '2026-11-18')).toEqual(saved);
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
