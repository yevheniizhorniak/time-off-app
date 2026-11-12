import { useCallback, useMemo, useState, type ReactElement, type ReactNode } from 'react';

import type { SessionRepository } from '../browser-storage-repositories';
import type { Session } from '../time-off-domain';
import { SessionContext, type SessionState } from '../useSession';

type SessionProviderProps = {
  /** Application content sharing the active session. */
  children: ReactNode;
  /** Storage for the simulated login, scoped to this browser tab. */
  repository: SessionRepository;
};

export default function SessionProvider({ children, repository }: SessionProviderProps): ReactElement {
  const [state, setState] = useState<Pick<SessionState, 'session' | 'sessionError'>>(() => {
    try {
      return { session: repository.load(), sessionError: null };
    } catch {
      return { session: null, sessionError: 'Your previous session could not be restored. Please sign in again.' };
    }
  });

  const signIn = useCallback(
    (session: Session): void => {
      try {
        repository.save(session);
      } catch {
        throw new Error('Your login could not be saved. Enable browser session storage and try again.');
      }
      setState({ session, sessionError: null });
    },
    [repository],
  );

  const signOut = useCallback((): void => {
    try {
      repository.save(null);
    } catch {
      throw new Error('Your session could not be cleared. Check browser storage access and try again.');
    }
    setState((current) => ({ ...current, session: null }));
  }, [repository]);

  const value = useMemo(() => ({ ...state, signIn, signOut }), [state, signIn, signOut]);

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}
