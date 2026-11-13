import { createContext, useContext } from 'react';

import type { SessionState } from './types/session-state';

export const SessionContext = createContext<SessionState | null>(null);

export function useSession(): SessionState {
  const context = useContext(SessionContext);
  if (!context) throw new Error('useSession requires SessionProvider.');
  return context;
}
