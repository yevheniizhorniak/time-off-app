import { useCallback, useMemo, type ReactElement, type ReactNode } from 'react';

import type { RequestRepository } from './storage';
import { createTimeOffRequest, dateKey, reviewTimeOffRequest, type RequestDraft } from './timeOff';
import { useRequestStore } from './useRequestStore';
import { useSession } from './useSession';
import { TimeOffContext } from './useTimeOff';

type TimeOffProviderProps = {
  /** Application content sharing requests. */
  children: ReactNode;
  /** Persistence adapter supplied at the application boundary. */
  repository: RequestRepository;
};

export default function TimeOffProvider({ children, repository }: TimeOffProviderProps): ReactElement {
  const { session } = useSession();
  const { requests, storageError, busy, reload, persist } = useRequestStore(repository);

  const submitRequest = useCallback(
    async (draft: RequestDraft): Promise<void> => {
      if (session?.role !== 'employee') throw new Error('Sign in as an employee to submit a request.');
      await persist((current) => {
        const now = new Date();
        const request = createTimeOffRequest(draft, session, current, {
          id: crypto.randomUUID(),
          createdAt: now.toISOString(),
          today: dateKey(now),
        });
        return [...current, request];
      });
    },
    [session, persist],
  );

  const reviewRequest = useCallback(
    async (id: string, status: 'approved' | 'rejected', note: string): Promise<void> => {
      if (session?.role !== 'supervisor') throw new Error('Sign in as a supervisor to review requests.');
      await persist((current) => reviewTimeOffRequest(current, id, status, note, new Date().toISOString()));
    },
    [session, persist],
  );

  const value = useMemo(
    () => ({ requests, storageError, busy, reload, submitRequest, reviewRequest }),
    [requests, storageError, busy, reload, submitRequest, reviewRequest],
  );

  return <TimeOffContext.Provider value={value}>{children}</TimeOffContext.Provider>;
}
