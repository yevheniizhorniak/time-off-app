import { dateKey } from '../../type-safety/date-key';

import { isLeaveType } from './types/leave-type';
import type { TimeOffEmployee } from './types/time-off-employee';
import type { TimeOffRequest } from './types/time-off-request';
import type { TimeOffRequestDraft } from './types/time-off-request-draft';
import { TimeOffRequestValidationError } from './types/time-off-request-errors';
import { employeeHasTimeOffOnDate } from './validation/employee-has-time-off-on-date';
import { validateTimeOffRequest } from './validation/validate-time-off-request';

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
