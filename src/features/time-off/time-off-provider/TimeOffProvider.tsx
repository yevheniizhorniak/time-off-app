import { useCallback, useMemo, type ReactElement, type ReactNode } from 'react';

import { useSession } from '../../auth/useSession';
import { TimeOffContext } from '../hooks/useTimeOff';
import { useTimeOffRequestStore } from '../hooks/useTimeOffRequestStore';
import type { TimeOffRequestDraft } from '../types/time-off-request-draft';
import type { TimeOffRequestRepository } from '../types/time-off-request-repository';

type TimeOffProviderProps = {
  /** Application content sharing time off requests. */
  children: ReactNode;
  /** Persistence adapter supplied at the application boundary. */
  repository: TimeOffRequestRepository;
};

export default function TimeOffProvider({ children, repository }: TimeOffProviderProps): ReactElement {
  const { session } = useSession();
  const { timeOffRequests, loadError, loading, hasLoaded, busy, reload, persist } = useTimeOffRequestStore(repository);

  const submitTimeOffRequest = useCallback(
    async (draft: TimeOffRequestDraft): Promise<void> => {
      if (session?.role !== 'employee') throw new Error('Sign in as an employee to submit a time off request.');
      await persist(() => repository.submit(draft, { name: session.name, employeeKey: session.employeeKey }));
    },
    [session, persist, repository],
  );

  const reviewTimeOffRequest = useCallback(
    async (id: string, status: 'approved' | 'rejected', note: string): Promise<void> => {
      if (session?.role !== 'supervisor') throw new Error('Sign in as a supervisor to review time off requests.');
      await persist(() => repository.review(id, status, note));
    },
    [session, persist, repository],
  );

  const cancelTimeOffRequest = useCallback(
    async (id: string): Promise<void> => {
      if (session?.role !== 'employee') throw new Error('Sign in as an employee to cancel a time off request.');
      await persist(() => repository.cancel(id, session.employeeKey));
    },
    [session, persist, repository],
  );

  const value = useMemo(
    () => ({
      timeOffRequests,
      loadError,
      loading,
      hasLoaded,
      busy,
      reload,
      submitTimeOffRequest,
      reviewTimeOffRequest,
      cancelTimeOffRequest,
    }),
    [
      timeOffRequests,
      loadError,
      loading,
      hasLoaded,
      busy,
      reload,
      submitTimeOffRequest,
      reviewTimeOffRequest,
      cancelTimeOffRequest,
    ],
  );

  return <TimeOffContext.Provider value={value}>{children}</TimeOffContext.Provider>;
}
