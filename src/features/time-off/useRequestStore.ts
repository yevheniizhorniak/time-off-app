import { useCallback, useEffect, useState } from 'react';

import type { RequestRepository } from './storage';
import { RequestDecisionError, RequestValidationError, type TimeOffRequest } from './timeOff';

type RequestSnapshot = {
  requests: TimeOffRequest[];
  storageError: string | null;
};

type RequestStore = RequestSnapshot & {
  busy: boolean;
  reload: () => void;
  persist: (change: (current: TimeOffRequest[]) => TimeOffRequest[]) => Promise<void>;
};

const readError =
  'Saved requests could not be read. Check browser storage access or restore valid saved data, then retry.';

/** Owns the shared request snapshot and its persistence lifecycle inside TimeOffProvider. */
export function useRequestStore(repository: RequestRepository): RequestStore {
  const [snapshot, setSnapshot] = useState<RequestSnapshot>(() => {
    try {
      return { requests: repository.load(), storageError: null };
    } catch {
      return { requests: [], storageError: readError };
    }
  });
  const [pendingCount, setPendingCount] = useState(0);

  const reload = useCallback((): void => {
    try {
      setSnapshot({ requests: repository.load(), storageError: null });
    } catch {
      setSnapshot((current) => ({ ...current, storageError: readError }));
    }
  }, [repository]);

  useEffect(() => repository.subscribe(reload), [repository, reload]);

  const persist = useCallback(
    async (change: (current: TimeOffRequest[]) => TimeOffRequest[]): Promise<void> => {
      setPendingCount((current) => current + 1);
      try {
        const requests = await repository.update(change);
        setSnapshot({ requests, storageError: null });
      } catch (error) {
        if (error instanceof RequestValidationError || error instanceof RequestDecisionError) throw error;
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
