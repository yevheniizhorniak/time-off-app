import type { TimeOffRequest } from './time-off-domain';

/** Persistence contract for requests, independent of browser and framework APIs. */
export interface RequestRepository {
  /** Returns saved requests, or an empty array when absent. Throws on invalid data or read failure. */
  load(): TimeOffRequest[];
  /**
   * Applies a synchronous change to the latest saved requests and persists the complete result
   * before resolving. Read, change, or write failures reject and preserve saved data.
   * Callers publish the returned snapshot after success.
   */
  update(change: (requests: TimeOffRequest[]) => TimeOffRequest[]): Promise<TimeOffRequest[]>;
  /**
   * Notifies the caller when external changes may require a reload, including data removal.
   * Returns a cleanup function that removes the subscription.
   */
  subscribe(onChange: () => void): () => void;
}
