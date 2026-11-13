import type { TimeOffRequest } from './types/time-off-request';
import { TimeOffRequestCancellationError } from './types/time-off-request-errors';
import { cancellationStartDate } from './validation/cancellation-start-date';

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
