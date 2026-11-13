import { dateKey } from '../../type-safety/date-key';

import { isWeekend } from './holidays/is-weekend';
import { timeOffHolidaysForYear } from './holidays/time-off-holidays-for-year';
import type { TimeOffRequest } from './types/time-off-request';

function shiftedDate(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days, 12);
}

function workingDate(today: Date, offset: number, direction: number): Date {
  let candidate = shiftedDate(today, offset);
  while (
    isWeekend(dateKey(candidate)) ||
    timeOffHolidaysForYear(candidate.getFullYear()).some((holiday) => holiday.date === dateKey(candidate))
  ) {
    candidate = shiftedDate(candidate, direction);
  }
  return candidate;
}

/** Creates first-launch examples relative to the device's local calendar date. */
export function createDemoTimeOffRequests(today: Date): TimeOffRequest[] {
  const examples = [
    {
      id: 'demo-testusr-approved',
      date: workingDate(today, -20, -1),
      leaveType: 'paid-time-off',
      status: 'approved',
      note: 'Demo: a past vacation day.',
      reviewerNote: 'Enjoy your break!',
    },
    {
      id: 'demo-testusr-rejected',
      date: workingDate(today, -10, -1),
      leaveType: 'sick-day',
      status: 'rejected',
      note: 'Demo: a past request with a decision note.',
      reviewerNote: 'Example rejection for demonstration.',
    },
    {
      id: 'demo-testusr-pending',
      date: workingDate(today, 5, 1),
      leaveType: 'paid-time-off',
      status: 'pending',
      note: 'Demo: an upcoming day awaiting supervisor review.',
    },
  ] as const;

  return examples.map(({ date, ...example }) => ({
    ...example,
    employeeName: 'testusr',
    employeeKey: 'testusr',
    startDate: dateKey(date),
    endDate: dateKey(date),
    createdAt: shiftedDate(example.status === 'pending' ? today : date, -7).toISOString(),
    ...(example.status === 'pending' ? {} : { reviewedAt: shiftedDate(date, -1).toISOString() }),
  }));
}
