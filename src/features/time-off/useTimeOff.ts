import { createContext, useContext } from 'react';

import type { RequestDraft, Session, TimeOffRequest } from './timeOff';

export type TimeOffState = {
  session: Session | null;
  requests: TimeOffRequest[];
  storageError: string | null;
  sessionError: string | null;
  busy: boolean;
  signIn: (session: Session) => void;
  signOut: () => void;
  reload: () => void;
  submitRequest: (draft: RequestDraft) => Promise<void>;
  reviewRequest: (id: string, status: 'approved' | 'rejected', note: string) => Promise<void>;
};

export const TimeOffContext = createContext<TimeOffState | null>(null);

export function useTimeOff(): TimeOffState {
  const context = useContext(TimeOffContext);
  if (!context) throw new Error('useTimeOff requires TimeOffProvider.');
  return context;
}
