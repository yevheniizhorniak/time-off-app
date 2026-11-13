import { dateKey } from '../../../type-safety/date-key';
import { isDate } from '../../../type-safety/is-date';
import { isWeekend } from '../holidays/is-weekend';
import { timeOffHolidayName } from '../holidays/time-off-holiday-name';
import { isLeaveType } from '../types/leave-type';
import type { TimeOffRequest } from '../types/time-off-request';
import type { TimeOffRequestDraft } from '../types/time-off-request-draft';
import type { TimeOffRequestErrors } from '../types/time-off-request-errors';

import { employeeHasTimeOffOnDate } from './employee-has-time-off-on-date';

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
