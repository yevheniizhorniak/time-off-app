import { useEffect, useState, type ReactElement, type ReactNode } from 'react';

import type { RequestRepository, SessionRepository } from './storage';
import {
  isLeaveType,
  RequestValidationError,
  validateRequest,
  type RequestDraft,
  type TimeOffRequest,
} from './timeOff';
import { TimeOffContext } from './useTimeOff';

type TimeOffProviderProps = {
  /** Application content sharing the active session and requests. */
  children: ReactNode;
  /** Persistence adapter supplied at the application boundary. */
  repository: RequestRepository;
  /** Storage for the simulated login, scoped to this browser tab. */
  sessionRepository: SessionRepository;
};

const readError =
  'Saved requests could not be read. Check browser storage access or restore valid saved data, then retry.';

export default function TimeOffProvider({
  children,
  repository,
  sessionRepository,
}: TimeOffProviderProps): ReactElement {
  const [initial] = useState(() => {
    let requests: TimeOffRequest[] = [];
    let storageError: string | null = null;
    let sessionError: string | null = null;
    let session = null as ReturnType<SessionRepository['load']>;
    try {
      requests = repository.load();
    } catch {
      storageError = readError;
    }
    try {
      session = sessionRepository.load();
    } catch {
      sessionError = 'Your previous session could not be restored. Please sign in again.';
    }
    return { requests, storageError, session, sessionError };
  });
  const [requests, setRequests] = useState(initial.requests);
  const [storageError, setStorageError] = useState(initial.storageError);
  const [session, setSession] = useState(initial.session);
  const [sessionError, setSessionError] = useState(initial.sessionError);
  const [busy, setBusy] = useState(false);

  function reload(): void {
    try {
      setRequests(repository.load());
      setStorageError(null);
    } catch {
      setStorageError(readError);
    }
  }

  useEffect(
    () =>
      repository.subscribe(() => {
        try {
          setRequests(repository.load());
          setStorageError(null);
        } catch {
          setStorageError(readError);
        }
      }),
    [repository],
  );

  async function persist(change: (current: TimeOffRequest[]) => TimeOffRequest[]): Promise<void> {
    setBusy(true);
    try {
      setRequests(await repository.update(change));
      setStorageError(null);
    } catch (error) {
      if (error instanceof RequestValidationError) throw error;
      throw new Error(
        error instanceof Error && error.name === 'RequestDecisionError'
          ? error.message
          : 'Your changes could not be saved. Check browser storage access and try again.',
        { cause: error },
      );
    } finally {
      setBusy(false);
    }
  }

  async function submitRequest(draft: RequestDraft): Promise<void> {
    if (session?.role !== 'employee') throw new Error('Sign in as an employee to submit a request.');
    await persist((current) => {
      const errors = validateRequest(draft, session.employeeKey, current);
      if (Object.keys(errors).length > 0) throw new RequestValidationError(errors);
      if (!isLeaveType(draft.leaveType)) throw new Error('Choose a time off type.');
      return [
        ...current,
        {
          ...draft,
          note: draft.note.trim(),
          leaveType: draft.leaveType,
          id: crypto.randomUUID(),
          employeeKey: session.employeeKey,
          employeeName: session.name,
          status: 'pending',
          createdAt: new Date().toISOString(),
        },
      ];
    });
  }

  async function reviewRequest(id: string, status: 'approved' | 'rejected', note: string): Promise<void> {
    if (session?.role !== 'supervisor') throw new Error('Sign in as a supervisor to review requests.');
    await persist((current) => {
      const request = current.find((item) => item.id === id);
      if (!request || request.status !== 'pending') {
        const error = new Error(
          'This request has already been reviewed or is no longer available. Refresh the requests and try again.',
        );
        error.name = 'RequestDecisionError';
        throw error;
      }
      return current.map((item) =>
        item.id === id ? { ...item, status, reviewerNote: note.trim(), reviewedAt: new Date().toISOString() } : item,
      );
    });
  }

  return (
    <TimeOffContext.Provider
      value={{
        requests,
        session,
        storageError,
        sessionError,
        busy,
        reload,
        submitRequest,
        reviewRequest,
        signIn(nextSession) {
          try {
            sessionRepository.save(nextSession);
          } catch {
            throw new Error('Your login could not be saved. Enable browser session storage and try again.');
          }
          setSession(nextSession);
          setSessionError(null);
        },
        signOut() {
          try {
            sessionRepository.save(null);
          } catch {
            throw new Error('Your session could not be cleared. Check browser storage access and try again.');
          }
          setSession(null);
        },
      }}
    >
      {children}
    </TimeOffContext.Provider>
  );
}
