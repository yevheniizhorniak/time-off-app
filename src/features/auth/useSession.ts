import { createContext, useContext } from 'react';

import type { Session } from './session-domain';

export type SessionState = {
  session: Session | null;
  sessionError: string | null;
  signIn: (session: Session) => void;
  signOut: () => void;
};

export const SessionContext = createContext<SessionState | null>(null);

export function useSession(): SessionState {
  const context = useContext(SessionContext);
  if (!context) throw new Error('useSession requires SessionProvider.');
  return context;
}
