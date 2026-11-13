import type { TimeOffRequest } from './time-off-request';

export interface RequestRepository {
  /** Returns an empty array when absent. Throws on invalid data or read failure. */
  load(): TimeOffRequest[];
  /**
   * Applies `change` to the latest saved requests and persists before resolving.
   * Failures reject and preserve saved data. Publish the returned snapshot after success.
   */
  update(change: (requests: TimeOffRequest[]) => TimeOffRequest[]): Promise<TimeOffRequest[]>;
  /** Signals external changes, including removal. Returns an unsubscribe function. */
  subscribe(onChange: () => void): () => void;
}
