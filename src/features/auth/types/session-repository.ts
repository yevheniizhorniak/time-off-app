import type { Session } from './session';

export interface SessionRepository {
  /** Returns `null` when absent. Throws on invalid data or read failure. */
  load(): Session | null;
  /**
   * Persists before returning. Pass `null` to remove the session.
   * Failures throw and preserve saved data. Publish state after success.
   */
  save(session: Session | null): void;
}
