import { useCallback, useMemo, type ReactElement, type ReactNode } from 'react';

import { useSession } from '../../auth/useSession';
import { useRequestStore } from '../hooks/useRequestStore';
import { TimeOffContext } from '../hooks/useTimeOff';
import type { RequestRepository } from '../request-repository';
import {
  cancelTimeOffRequest,
  createTimeOffRequest,
  dateKey,
  reviewTimeOffRequest,
  type RequestDraft,
} from '../time-off-domain';

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

  const cancelRequest = useCallback(
    async (id: string): Promise<void> => {
      if (session?.role !== 'employee') throw new Error('Sign in as an employee to cancel a request.');
      await persist((current) => {
        const now = new Date();
        return cancelTimeOffRequest(current, id, session.employeeKey, {
          today: dateKey(now),
          cancelledAt: now.toISOString(),
        });
      });
    },
    [session, persist],
  );

  const value = useMemo(
    () => ({ requests, storageError, busy, reload, submitRequest, reviewRequest, cancelRequest }),
    [requests, storageError, busy, reload, submitRequest, reviewRequest, cancelRequest],
  );

  return <TimeOffContext.Provider value={value}>{children}</TimeOffContext.Provider>;
}
