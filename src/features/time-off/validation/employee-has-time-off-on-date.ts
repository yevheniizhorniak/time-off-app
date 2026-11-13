import { timeOffRequestsOnDate } from '../time-off-requests-on-date';
import type { TimeOffRequest } from '../types/time-off-request';

/** Active working-day coverage for one employee, including partial cancellations and exclusions. */
export function employeeHasTimeOffOnDate(
  timeOffRequests: readonly TimeOffRequest[],
  employeeKey: string,
  date: string,
): boolean {
  return timeOffRequestsOnDate(timeOffRequests, date).some((request) => request.employeeKey === employeeKey);
}
