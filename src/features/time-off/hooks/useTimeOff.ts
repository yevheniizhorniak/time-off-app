import { createContext, useContext } from 'react';

import type { TimeOffState } from '../types/time-off-state';

export const TimeOffContext = createContext<TimeOffState | null>(null);

export function useTimeOff(): TimeOffState {
  const context = useContext(TimeOffContext);
  if (!context) throw new Error('useTimeOff requires TimeOffProvider.');
  return context;
}
