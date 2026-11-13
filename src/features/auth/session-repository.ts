import type { Session } from './session-domain';

/** Persistence contract for the simulated session, independent of its storage adapter. */
export interface SessionRepository {
  /** Returns the saved session or null when absent. Throws when data is invalid or cannot be read. */
  load(): Session | null;
  /**
   * Persists the session, or removes it for null, before returning.
   * Throws on failure and preserves the saved session. Callers publish state after success.
   */
  save(session: Session | null): void;
}
