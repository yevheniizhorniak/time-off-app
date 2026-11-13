import { dateKey } from '../../components/calendar/date-key';
import { isDate } from '../../type-safety/is-date';
import type { Session } from '../auth/types/session';

import { isWeekend, timeOffHolidayName } from './time-off-holidays';
import {
  RequestCancellationError,
  RequestDecisionError,
  RequestValidationError,
  type RequestErrors,
} from './types/errors';
import { isLeaveType, leaveTypes, type LeaveType } from './types/leave-type';
import type { RequestDraft } from './types/request-draft';
import type { TimeOffRequest } from './types/time-off-request';

export { dateKey } from '../../components/calendar/date-key';
export { formatDate } from '../../components/calendar/format-date';
export { monthDays } from '../../components/calendar/month-days';
export { isDate } from '../../type-safety/is-date';

export function leaveTypeLabel(type: LeaveType): string {
  return leaveTypes.find((option) => option.value === type)!.label;
}

/** Active leave on working weekdays, excluding configured public holidays. */
export function requestsOnDate(requests: readonly TimeOffRequest[], date: string): TimeOffRequest[] {
  if (isWeekend(date) || timeOffHolidayName(date)) return [];
  return requests.filter(
    (request) =>
      (request.status === 'pending' || request.status === 'approved') &&
      request.startDate <= date &&
      request.endDate >= date &&
      (!request.cancelledFromDate || date < request.cancelledFromDate),
  );
}

export function validateRequest(
  draft: RequestDraft,
  key: string,
  requests: readonly TimeOffRequest[],
  today = dateKey(),
): RequestErrors {
  const errors: RequestErrors = {};
  if (!isDate(draft.startDate)) errors.startDate = 'Enter a valid start date.';
  else if (draft.startDate < today) errors.startDate = 'Start date must be today or later.';
  if (!isDate(draft.endDate)) errors.endDate = 'Enter a valid end date.';
  else if (draft.endDate < today) errors.endDate = 'End date must be today or later.';
  else if (!errors.startDate && draft.endDate < draft.startDate)
    errors.endDate = 'End date must be on or after the start date.';
  for (const field of ['startDate', 'endDate'] as const) {
    if (errors[field]) continue;
    const label = field === 'startDate' ? 'Start date' : 'End date';
    const holiday = timeOffHolidayName(draft[field]);
    if (holiday) errors[field] = `${label} cannot be a public holiday (${holiday}).`;
    else if (isWeekend(draft[field])) errors[field] = `${label} must be a weekday.`;
  }
  if (!isLeaveType(draft.leaveType)) errors.leaveType = 'Choose a time off type.';

  if (
    !errors.startDate &&
    !errors.endDate &&
    requests.some(
      (request) =>
        request.employeeKey === key &&
        (request.status === 'pending' || request.status === 'approved') &&
        draft.startDate <= request.endDate &&
        draft.endDate >= request.startDate &&
        (!request.cancelledFromDate || draft.startDate < request.cancelledFromDate),
    )
  ) {
    errors.startDate = 'These dates overlap one of your pending or approved requests.';
  }
  return errors;
}

export function createTimeOffRequest(
  draft: RequestDraft,
  employee: Extract<Session, { role: 'employee' }>,
  requests: readonly TimeOffRequest[],
  metadata: { id: string; createdAt: string; today: string },
): TimeOffRequest {
  const errors = validateRequest(draft, employee.employeeKey, requests, metadata.today);
  if (Object.keys(errors).length > 0) throw new RequestValidationError(errors);
  if (!isLeaveType(draft.leaveType)) throw new Error('Choose a time off type.');
  return {
    ...draft,
    note: draft.note.trim(),
    leaveType: draft.leaveType,
    id: metadata.id,
    employeeKey: employee.employeeKey,
    employeeName: employee.name,
    status: 'pending',
    createdAt: metadata.createdAt,
  };
}

export function reviewTimeOffRequest(
  requests: readonly TimeOffRequest[],
  id: string,
  status: 'approved' | 'rejected',
  note: string,
  reviewedAt: string,
): TimeOffRequest[] {
  const request = requests.find((item) => item.id === id);
  if (!request || request.status !== 'pending') throw new RequestDecisionError();
  return requests.map((item) => (item.id === id ? { ...item, status, reviewerNote: note.trim(), reviewedAt } : item));
}

/** First cancellable date, or null when the request has no remaining cancellable dates. */
export function cancellationStartDate(request: TimeOffRequest, today = dateKey()): string | null {
  if (
    (request.status !== 'pending' && request.status !== 'approved') ||
    request.cancelledFromDate ||
    request.endDate <= today
  ) {
    return null;
  }
  const tomorrow = new Date(`${today}T12:00:00`);
  tomorrow.setDate(tomorrow.getDate() + 1);
  return request.startDate > today ? request.startDate : dateKey(tomorrow);
}

export function cancelTimeOffRequest(
  requests: readonly TimeOffRequest[],
  id: string,
  employeeKey: string,
  metadata: { today: string; cancelledAt: string },
): TimeOffRequest[] {
  const request = requests.find((item) => item.id === id);
  if (!request || request.employeeKey !== employeeKey) throw new RequestCancellationError();
  const cancelledFromDate = cancellationStartDate(request, metadata.today);
  if (!cancelledFromDate) throw new RequestCancellationError();
  return requests.map((item) =>
    item.id === id
      ? {
          ...item,
          status: cancelledFromDate === item.startDate ? 'cancelled' : item.status,
          cancelledFromDate,
          cancelledAt: metadata.cancelledAt,
        }
      : item,
  );
}
