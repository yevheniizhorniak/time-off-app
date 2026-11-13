import { useCallback, useEffect, useRef, useState } from 'react';

import {
  TimeOffRequestCancellationError,
  TimeOffRequestDecisionError,
  TimeOffRequestValidationError,
} from '../types/time-off-request-errors';
import type { TimeOffRequestRepository } from '../types/time-off-request-repository';
import type { TimeOffRequestStore } from '../types/time-off-request-store';

type StoreState = Omit<TimeOffRequestStore, 'reload' | 'persist'> & { repository: TimeOffRequestRepository };
type StoreActions = Pick<TimeOffRequestStore, 'reload' | 'persist'> & { repository: TimeOffRequestRepository };

function initialState(repository: TimeOffRequestRepository): StoreState {
  return { repository, timeOffRequests: [], loadError: null, loading: true, hasLoaded: false, busy: false };
}

/** Serializes reads and commands, publishing only results from the active repository lifecycle. */
export function useTimeOffRequestStore(repository: TimeOffRequestRepository): TimeOffRequestStore {
  const [state, setState] = useState(() => initialState(repository));
  const actions = useRef<StoreActions | null>(null);

  useEffect(() => {
    let active = true;
    let tail = Promise.resolve();
    let pendingReads = 0;
    let pendingWrites = 0;

    function publish(change: Partial<StoreState>): void {
      if (!active) return;
      setState((current) => {
        if (!active) return current;
        return { ...(current.repository === repository ? current : initialState(repository)), ...change };
      });
    }

    function enqueue(operation: () => Promise<void>): Promise<void> {
      const result = tail.then(() => {
        if (!active) throw new Error('The time off request store is no longer active.');
        return operation();
      });
      // A rejected operation must not prevent subsequent reads or retries.
      tail = result.catch(() => undefined);
      return result;
    }

    function reload(): void {
      pendingReads += 1;
      publish({ loading: true });
      void enqueue(async () => {
        try {
          const timeOffRequests = await repository.load();
          publish({ timeOffRequests, loadError: null, hasLoaded: true });
        } catch {
          publish({ loadError: 'Time off requests could not be loaded. Please try again.' });
        } finally {
          pendingReads -= 1;
          publish({ loading: pendingReads > 0 });
        }
      }).catch(() => undefined);
    }

    const persist: TimeOffRequestStore['persist'] = (command) => {
      pendingWrites += 1;
      publish({ busy: true });
      return enqueue(async () => {
        try {
          const timeOffRequests = await command();
          publish({ timeOffRequests, loadError: null, hasLoaded: true });
        } catch (error) {
          if (
            error instanceof TimeOffRequestValidationError ||
            error instanceof TimeOffRequestDecisionError ||
            error instanceof TimeOffRequestCancellationError
          ) {
            throw error;
          }
          throw new Error('Your changes could not be saved. Please try again.', { cause: error });
        } finally {
          pendingWrites -= 1;
          publish({ busy: pendingWrites > 0 });
        }
      });
    };

    actions.current = { repository, reload, persist };
    const unsubscribe = repository.subscribe(reload);
    reload();
    return () => {
      active = false;
      unsubscribe();
    };
  }, [repository]);

  const reload = useCallback((): void => {
    if (actions.current?.repository === repository) actions.current.reload();
  }, [repository]);
  const persist = useCallback<TimeOffRequestStore['persist']>(
    (command) => {
      if (actions.current?.repository !== repository) {
        return Promise.reject(new Error('The time off request store is no longer active.'));
      }
      return actions.current.persist(command);
    },
    [repository],
  );

  const snapshot = state.repository === repository ? state : initialState(repository);
  return {
    timeOffRequests: snapshot.timeOffRequests,
    loadError: snapshot.loadError,
    loading: snapshot.loading,
    hasLoaded: snapshot.hasLoaded,
    busy: snapshot.busy,
    reload,
    persist,
  };
}
