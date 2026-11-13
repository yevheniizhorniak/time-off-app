import type { TimeOffRequest } from './types/time-off-request';
import { TimeOffRequestDecisionError } from './types/time-off-request-errors';

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
