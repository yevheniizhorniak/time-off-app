import { isWeekend } from './holidays/is-weekend';
import { timeOffHolidayName } from './holidays/time-off-holiday-name';
import type { TimeOffRequest } from './types/time-off-request';

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
