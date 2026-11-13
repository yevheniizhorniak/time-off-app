import type { TimeOffEmployee } from './time-off-employee';
import type { TimeOffRequest } from './time-off-request';
import type { TimeOffRequestDraft } from './time-off-request-draft';

export interface TimeOffRequestRepository {
  /** Resolves empty when absent. Rejects on invalid data or read failure. */
  load(): Promise<TimeOffRequest[]>;
  /**
   * Commands validate against current data and resolve with the complete persisted collection.
   * Invalid submissions reject with TimeOffRequestValidationError; stale reviews and cancellations
   * use TimeOffRequestDecisionError and TimeOffRequestCancellationError. Failures preserve saved data.
   */
  submit(draft: TimeOffRequestDraft, employee: TimeOffEmployee): Promise<TimeOffRequest[]>;
  review(id: string, status: 'approved' | 'rejected', note: string): Promise<TimeOffRequest[]>;
  cancel(id: string, employeeKey: string): Promise<TimeOffRequest[]>;
  /** Signals external changes, including removal. Returns an unsubscribe function. */
  subscribe(onChange: () => void): () => void;
}
