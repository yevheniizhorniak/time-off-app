import { useCallback, useEffect, useState } from 'react';

import type { TimeOffRequest } from '../types/time-off-request';
import {
  TimeOffRequestCancellationError,
  TimeOffRequestDecisionError,
  TimeOffRequestValidationError,
} from '../types/time-off-request-errors';
import type { TimeOffRequestRepository } from '../types/time-off-request-repository';
import type { TimeOffRequestSnapshot } from '../types/time-off-request-snapshot';
import type { TimeOffRequestStore } from '../types/time-off-request-store';

const readError =
  'Saved time off requests could not be read. Check browser storage access or restore valid saved data, then retry.';

/** Owns the shared time off request snapshot and its persistence lifecycle inside TimeOffProvider. */
export function useTimeOffRequestStore(repository: TimeOffRequestRepository): TimeOffRequestStore {
  const [snapshot, setSnapshot] = useState<TimeOffRequestSnapshot>(() => {
    try {
      return { timeOffRequests: repository.load(), storageError: null };
    } catch {
      return { timeOffRequests: [], storageError: readError };
    }
  });
  const [pendingCount, setPendingCount] = useState(0);

  const reload = useCallback((): void => {
    try {
      setSnapshot({ timeOffRequests: repository.load(), storageError: null });
    } catch {
      setSnapshot((current) => ({ ...current, storageError: readError }));
    }
  }, [repository]);

  useEffect(() => repository.subscribe(reload), [repository, reload]);

  const persist = useCallback(
    async (change: (current: TimeOffRequest[]) => TimeOffRequest[]): Promise<void> => {
      setPendingCount((current) => current + 1);
      try {
        const timeOffRequests = await repository.update(change);
        setSnapshot({ timeOffRequests, storageError: null });
      } catch (error) {
        if (
          error instanceof TimeOffRequestValidationError ||
          error instanceof TimeOffRequestDecisionError ||
          error instanceof TimeOffRequestCancellationError
        ) {
          throw error;
        }
        throw new Error('Your changes could not be saved. Check browser storage access and try again.', {
          cause: error,
        });
      } finally {
        setPendingCount((current) => current - 1);
      }
    },
    [repository],
  );

  return { ...snapshot, busy: pendingCount > 0, reload, persist };
}
