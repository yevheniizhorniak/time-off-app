import { dateKey } from '../../../type-safety/date-key';
import type { TimeOffRequest } from '../types/time-off-request';

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
