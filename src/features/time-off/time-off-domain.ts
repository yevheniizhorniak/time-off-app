import { dateKey } from '../../type-safety/date-key';
import { isDate } from '../../type-safety/is-date';

import { isWeekend } from './holidays/is-weekend';
import { timeOffHolidayName } from './holidays/time-off-holiday-name';
import { isLeaveType, leaveTypes, type LeaveType } from './types/leave-type';
import type { TimeOffEmployee } from './types/time-off-employee';
import type { TimeOffRequest } from './types/time-off-request';
import type { TimeOffRequestDraft } from './types/time-off-request-draft';
import {
  TimeOffRequestCancellationError,
  TimeOffRequestDecisionError,
  TimeOffRequestValidationError,
  type TimeOffRequestErrors,
} from './types/time-off-request-errors';

export function leaveTypeLabel(type: LeaveType): string {
  return leaveTypes.find((option) => option.value === type)!.label;
}

/** Active leave on working weekdays, excluding configured public holidays. */
export function timeOffRequestsOnDate(timeOffRequests: readonly TimeOffRequest[], date: string): TimeOffRequest[] {
  if (isWeekend(date) || timeOffHolidayName(date)) return [];
  return timeOffRequests.filter(
    (timeOffRequest) =>
      (timeOffRequest.status === 'pending' || timeOffRequest.status === 'approved') &&
      timeOffRequest.startDate <= date &&
      timeOffRequest.endDate >= date &&
      !timeOffRequest.excludedDates?.includes(date) &&
      (!timeOffRequest.cancelledFromDate || date < timeOffRequest.cancelledFromDate),
  );
}

/** Active working-day coverage for one employee, including partial cancellations and exclusions. */
export function employeeHasTimeOffOnDate(
  timeOffRequests: readonly TimeOffRequest[],
  employeeKey: string,
  date: string,
): boolean {
  return timeOffRequestsOnDate(timeOffRequests, date).some((request) => request.employeeKey === employeeKey);
}

export function validateTimeOffRequest(
  draft: TimeOffRequestDraft,
  key: string,
  timeOffRequests: readonly TimeOffRequest[],
  today = dateKey(),
): TimeOffRequestErrors {
  const errors: TimeOffRequestErrors = {};
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

  for (const field of ['startDate', 'endDate'] as const) {
    if (!errors[field] && employeeHasTimeOffOnDate(timeOffRequests, key, draft[field])) {
      errors[field] = 'This date is already covered by one of your pending or approved time off requests.';
    }
  }
  return errors;
}

export function createTimeOffRequest(
  draft: TimeOffRequestDraft,
  employee: TimeOffEmployee,
  timeOffRequests: readonly TimeOffRequest[],
  metadata: { id: string; createdAt: string; today: string },
): TimeOffRequest {
  const errors = validateTimeOffRequest(draft, employee.employeeKey, timeOffRequests, metadata.today);
  if (Object.keys(errors).length > 0) throw new TimeOffRequestValidationError(errors);
  if (!isLeaveType(draft.leaveType)) throw new Error('Choose a time off type.');
  const excludedDates: string[] = [];
  const day = new Date(`${draft.startDate}T12:00:00`);
  day.setDate(day.getDate() + 1);
  for (; dateKey(day) < draft.endDate; day.setDate(day.getDate() + 1)) {
    const date = dateKey(day);
    if (employeeHasTimeOffOnDate(timeOffRequests, employee.employeeKey, date)) excludedDates.push(date);
  }
  return {
    ...draft,
    note: draft.note.trim(),
    leaveType: draft.leaveType,
    id: metadata.id,
    employeeKey: employee.employeeKey,
    employeeName: employee.name,
    status: 'pending',
    createdAt: metadata.createdAt,
    ...(excludedDates.length > 0 && { excludedDates }),
  };
}

export function reviewTimeOffRequest(
  timeOffRequests: readonly TimeOffRequest[],
  id: string,
  status: 'approved' | 'rejected',
  note: string,
  reviewedAt: string,
): TimeOffRequest[] {
  const timeOffRequest = timeOffRequests.find((item) => item.id === id);
  if (!timeOffRequest || timeOffRequest.status !== 'pending') throw new TimeOffRequestDecisionError();
  return timeOffRequests.map((item) =>
    item.id === id ? { ...item, status, reviewerNote: note.trim(), reviewedAt } : item,
  );
}

/** First cancellable date, or null when the time off request has no remaining cancellable dates. */
export function cancellationStartDate(timeOffRequest: TimeOffRequest, today = dateKey()): string | null {
  if (
    (timeOffRequest.status !== 'pending' && timeOffRequest.status !== 'approved') ||
    timeOffRequest.cancelledFromDate ||
    timeOffRequest.endDate <= today
  ) {
    return null;
  }
  const tomorrow = new Date(`${today}T12:00:00`);
  tomorrow.setDate(tomorrow.getDate() + 1);
  return timeOffRequest.startDate > today ? timeOffRequest.startDate : dateKey(tomorrow);
}

export function cancelTimeOffRequest(
  timeOffRequests: readonly TimeOffRequest[],
  id: string,
  employeeKey: string,
  metadata: { today: string; cancelledAt: string },
): TimeOffRequest[] {
  const timeOffRequest = timeOffRequests.find((item) => item.id === id);
  if (!timeOffRequest || timeOffRequest.employeeKey !== employeeKey) throw new TimeOffRequestCancellationError();
  const cancelledFromDate = cancellationStartDate(timeOffRequest, metadata.today);
  if (!cancelledFromDate) throw new TimeOffRequestCancellationError();
  return timeOffRequests.map((item) =>
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
