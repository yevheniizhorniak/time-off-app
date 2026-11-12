import { createContext, useContext } from 'react';

import type { RequestDraft, TimeOffRequest } from './time-off-domain';

export type TimeOffState = {
  requests: TimeOffRequest[];
  storageError: string | null;
  busy: boolean;
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
