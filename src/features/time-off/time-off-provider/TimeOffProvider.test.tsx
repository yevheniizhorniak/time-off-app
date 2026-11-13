import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';

import { createSessionRepository } from '../../auth/browser-session-repository';
import type { Session } from '../../auth/session-domain';
import SessionProvider from '../../auth/session-provider/SessionProvider';
import { useSession } from '../../auth/useSession';
import { createRequestRepository } from '../browser-request-repository';
import { useTimeOff } from '../hooks/useTimeOff';
import {
  RequestCancellationError,
  RequestDecisionError,
  RequestValidationError,
  type RequestDraft,
  type TimeOffRequest,
} from '../time-off-domain';

import TimeOffProvider from './TimeOffProvider';

const employee: Session = { role: 'employee', name: 'Alex', employeeKey: 'alex' };
const draft: RequestDraft = {
  startDate: '2026-11-12',
  endDate: '2026-11-13',
  leaveType: 'paid-time-off',
  note: ' Family trip ',
};
const request: TimeOffRequest = {
  ...draft,
  id: 'one',
  leaveType: 'paid-time-off',
  employeeKey: 'alex',
  employeeName: 'Alex',
  status: 'pending',
  createdAt: '2026-11-12T08:00:00Z',
};

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-11-12T12:00:00Z'));
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

function renderTimeOff(session: Session | null = null) {
  const repository = createRequestRepository(() => localStorage);
  const sessionRepository = createSessionRepository(() => sessionStorage);
  sessionRepository.save(session);
  const rendered = renderHook(() => ({ session: useSession(), timeOff: useTimeOff() }), {
    wrapper: ({ children }: { children: ReactNode }) => (
      <SessionProvider repository={sessionRepository}>
        <TimeOffProvider repository={repository}>{children}</TimeOffProvider>
      </SessionProvider>
    ),
  });
  return { ...rendered, repository };
}

test('authorizes each action against the current session before updating storage', async () => {
  const { result, repository } = renderTimeOff();
  const update = vi.spyOn(repository, 'update');
  await act(async () => {
    await expect(result.current.timeOff.submitRequest(draft)).rejects.toThrow('Sign in as an employee');
    await expect(result.current.timeOff.reviewRequest('one', 'approved', '')).rejects.toThrow(
      'Sign in as a supervisor',
    );
    await expect(result.current.timeOff.cancelRequest('one')).rejects.toThrow('Sign in as an employee');
  });
  expect(update).not.toHaveBeenCalled();

  act(() => result.current.session.signIn(employee));
  await act(async () => {
    await expect(result.current.timeOff.reviewRequest('one', 'approved', '')).rejects.toThrow(
      'Sign in as a supervisor',
    );
  });
  expect(update).not.toHaveBeenCalled();
  await act(async () => result.current.timeOff.submitRequest(draft));
  const created = result.current.timeOff.requests[0];
  expect(created).toMatchObject({ employeeKey: 'alex', note: 'Family trip', status: 'pending' });
  expect(created.id).toEqual(expect.any(String));
  expect(created.createdAt).toBe('2026-11-12T12:00:00.000Z');
  act(() => result.current.session.signIn({ role: 'supervisor' }));
  update.mockClear();
  await act(async () => {
    await expect(result.current.timeOff.submitRequest(draft)).rejects.toThrow('Sign in as an employee');
    await expect(result.current.timeOff.cancelRequest(created.id)).rejects.toThrow('Sign in as an employee');
  });
  expect(update).not.toHaveBeenCalled();
  await act(async () => result.current.timeOff.reviewRequest(created.id, 'approved', ' Enjoy your break '));
  expect(repository.load()[0]).toMatchObject({ status: 'approved', reviewerNote: 'Enjoy your break' });

  act(() => result.current.session.signOut());
  update.mockClear();
  await act(async () => {
    await expect(result.current.timeOff.reviewRequest(created.id, 'rejected', '')).rejects.toThrow(
      'Sign in as a supervisor',
    );
  });
  expect(update).not.toHaveBeenCalled();
});

test('validates submission against requests saved after the displayed snapshot was loaded', async () => {
  const { result, repository } = renderTimeOff(employee);
  await repository.update(() => [request]);
  expect(result.current.timeOff.requests).toEqual([]);
  await act(async () => {
    await expect(result.current.timeOff.submitRequest(draft)).rejects.toBeInstanceOf(RequestValidationError);
  });
  expect(repository.load()).toEqual([request]);
  expect(result.current.timeOff.busy).toBe(false);
});

test('rejects a decision when another update has already reviewed the displayed request', async () => {
  const { result, repository } = renderTimeOff({ role: 'supervisor' });
  await repository.update(() => [request]);
  act(() => result.current.timeOff.reload());
  const reviewed: TimeOffRequest = {
    ...request,
    status: 'rejected',
    reviewedAt: '2026-11-12T11:00:00Z',
    reviewerNote: 'Existing decision',
  };
  await repository.update(() => [reviewed]);
  expect(result.current.timeOff.requests[0].status).toBe('pending');
  await act(async () => {
    await expect(result.current.timeOff.reviewRequest(request.id, 'approved', '')).rejects.toBeInstanceOf(
      RequestDecisionError,
    );
  });
  expect(repository.load()).toEqual([reviewed]);
});

test('preserves both context values and actions across an unrelated parent render', () => {
  const { result, rerender } = renderTimeOff(employee);
  const initial = result.current;
  rerender();
  expect(result.current.session).toBe(initial.session);
  expect(result.current.timeOff).toBe(initial.timeOff);
});

test('request state updates do not render a consumer subscribed only to session context', async () => {
  const repository = createRequestRepository(() => localStorage);
  const sessionRepository = createSessionRepository(() => sessionStorage);
  sessionRepository.save(employee);
  const observeSession = vi.fn();
  function SessionConsumer() {
    observeSession(useSession());
    return null;
  }
  const { result } = renderHook(() => useTimeOff(), {
    wrapper: ({ children }: { children: ReactNode }) => (
      <SessionProvider repository={sessionRepository}>
        <TimeOffProvider repository={repository}>
          <SessionConsumer />
          {children}
        </TimeOffProvider>
      </SessionProvider>
    ),
  });
  const renderCount = observeSession.mock.calls.length;
  await act(async () => result.current.submitRequest(draft));
  expect(result.current.requests).toHaveLength(1);
  expect(observeSession).toHaveBeenCalledTimes(renderCount);
  act(() => result.current.reload());
  expect(observeSession).toHaveBeenCalledTimes(renderCount);
});

test('requires a time-off provider', () => {
  expect(() => renderHook(() => useTimeOff())).toThrow('useTimeOff requires TimeOffProvider.');
});

test('cancels the latest approved request while preserving its review details', async () => {
  const { result, repository } = renderTimeOff(employee);
  const future: TimeOffRequest = { ...request, startDate: '2026-11-13', endDate: '2026-11-16' };
  await repository.update(() => [future]);
  act(() => result.current.timeOff.reload());
  await repository.update(() => [
    { ...future, status: 'approved', reviewedAt: '2026-11-12T11:00:00Z', reviewerNote: 'Enjoy your break' },
  ]);
  expect(result.current.timeOff.requests[0].status).toBe('pending');
  await act(async () => result.current.timeOff.cancelRequest(future.id));
  expect(repository.load()[0]).toMatchObject({
    status: 'cancelled',
    cancelledFromDate: '2026-11-13',
    cancelledAt: '2026-11-12T12:00:00.000Z',
    reviewedAt: '2026-11-12T11:00:00Z',
    reviewerNote: 'Enjoy your break',
  });
  expect(result.current.timeOff.requests).toEqual(repository.load());
});

test('rejects another employee and stale cancellation attempts against the latest saved data', async () => {
  const { result, repository } = renderTimeOff(employee);
  const future: TimeOffRequest = { ...request, startDate: '2026-11-13', endDate: '2026-11-16' };
  await repository.update(() => [future]);
  act(() => result.current.timeOff.reload());
  for (const saved of [
    [],
    [{ ...future, employeeName: 'Bob', employeeKey: 'bob' }],
    [{ ...future, status: 'rejected' as const, reviewedAt: '2026-11-12T11:00:00Z' }],
    [{ ...future, status: 'cancelled' as const, cancelledFromDate: future.startDate, cancelledAt: future.createdAt }],
  ]) {
    await repository.update(() => saved);
    await act(async () => {
      await expect(result.current.timeOff.cancelRequest(future.id)).rejects.toBeInstanceOf(RequestCancellationError);
    });
    expect(repository.load()).toEqual(saved);
    expect(result.current.timeOff.busy).toBe(false);
  }
});

test('partially cancels ongoing leave and preserves it after a failed write for retry', async () => {
  const { result, repository } = renderTimeOff(employee);
  await repository.update(() => [request]);
  act(() => result.current.timeOff.reload());
  const write = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new DOMException('Storage full', 'QuotaExceededError');
  });
  await act(async () => {
    await expect(result.current.timeOff.cancelRequest(request.id)).rejects.toThrow('Your changes could not be saved');
  });
  expect(result.current.timeOff.requests).toEqual([request]);
  expect(repository.load()).toEqual([request]);
  expect(result.current.timeOff.busy).toBe(false);
  write.mockRestore();
  await act(async () => result.current.timeOff.cancelRequest(request.id));
  expect(repository.load()[0]).toMatchObject({
    status: 'pending',
    startDate: request.startDate,
    endDate: request.endDate,
    cancelledFromDate: '2026-11-13',
    cancelledAt: '2026-11-12T12:00:00.000Z',
  });
});
