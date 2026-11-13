import { useCallback, useMemo, type ReactElement, type ReactNode } from 'react';

import { useSession } from '../../auth/useSession';
import { TimeOffContext } from '../hooks/useTimeOff';
import { useTimeOffRequestStore } from '../hooks/useTimeOffRequestStore';
import * as timeOffDomain from '../time-off-domain';
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
  const { timeOffRequests, storageError, busy, reload, persist } = useTimeOffRequestStore(repository);

  const submitTimeOffRequest = useCallback(
    async (draft: TimeOffRequestDraft): Promise<void> => {
      if (session?.role !== 'employee') throw new Error('Sign in as an employee to submit a time off request.');
      await persist((current) => {
        const now = new Date();
        const timeOffRequest = timeOffDomain.createTimeOffRequest(draft, session, current, {
          id: crypto.randomUUID(),
          createdAt: now.toISOString(),
          today: timeOffDomain.dateKey(now),
        });
        return [...current, timeOffRequest];
      });
    },
    [session, persist],
  );

  const reviewTimeOffRequest = useCallback(
    async (id: string, status: 'approved' | 'rejected', note: string): Promise<void> => {
      if (session?.role !== 'supervisor') throw new Error('Sign in as a supervisor to review time off requests.');
      await persist((current) =>
        timeOffDomain.reviewTimeOffRequest(current, id, status, note, new Date().toISOString()),
      );
    },
    [session, persist],
  );

  const cancelTimeOffRequest = useCallback(
    async (id: string): Promise<void> => {
      if (session?.role !== 'employee') throw new Error('Sign in as an employee to cancel a time off request.');
      await persist((current) => {
        const now = new Date();
        return timeOffDomain.cancelTimeOffRequest(current, id, session.employeeKey, {
          today: timeOffDomain.dateKey(now),
          cancelledAt: now.toISOString(),
        });
      });
    },
    [session, persist],
  );

  const value = useMemo(
    () => ({
      timeOffRequests,
      storageError,
      busy,
      reload,
      submitTimeOffRequest,
      reviewTimeOffRequest,
      cancelTimeOffRequest,
    }),
    [timeOffRequests, storageError, busy, reload, submitTimeOffRequest, reviewTimeOffRequest, cancelTimeOffRequest],
  );

  return <TimeOffContext.Provider value={value}>{children}</TimeOffContext.Provider>;
}
