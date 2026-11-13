import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';

import { createSessionRepository } from '../../auth/browser-session-repository';
import SessionProvider from '../../auth/session-provider/SessionProvider';
import type { Session } from '../../auth/types/session';
import { useSession } from '../../auth/useSession';
import { createTimeOffRequestRepository } from '../browser-time-off-request-repository';
import { useTimeOff } from '../hooks/useTimeOff';
import type { TimeOffRequest } from '../types/time-off-request';
import type { TimeOffRequestDraft } from '../types/time-off-request-draft';
import {
  TimeOffRequestCancellationError,
  TimeOffRequestDecisionError,
  TimeOffRequestValidationError,
} from '../types/time-off-request-errors';

import TimeOffProvider from './TimeOffProvider';

const employee: Session = { role: 'employee', name: 'Alex', employeeKey: 'alex' };
const draft: TimeOffRequestDraft = {
  startDate: '2026-11-12',
  endDate: '2026-11-13',
  leaveType: 'paid-time-off',
  note: ' Family trip ',
};
const timeOffRequest: TimeOffRequest = {
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

function saveTimeOffRequests(timeOffRequests: TimeOffRequest[]): void {
  localStorage.setItem('time-off-app.time-off-requests', JSON.stringify({ version: 2, timeOffRequests }));
}

async function renderTimeOff(session: Session | null = null) {
  const repository = createTimeOffRequestRepository(() => localStorage);
  const sessionRepository = createSessionRepository(() => sessionStorage);
  sessionRepository.save(session);
  const rendered = renderHook(() => ({ session: useSession(), timeOff: useTimeOff() }), {
    wrapper: ({ children }: { children: ReactNode }) => (
      <SessionProvider repository={sessionRepository}>
        <TimeOffProvider repository={repository}>{children}</TimeOffProvider>
      </SessionProvider>
    ),
  });
  await waitFor(() => expect(rendered.result.current.timeOff.loading).toBe(false));
  return { ...rendered, repository };
}

test('authorizes each action against the current session before updating storage', async () => {
  const { result, repository } = await renderTimeOff();
  const commands = [vi.spyOn(repository, 'submit'), vi.spyOn(repository, 'review'), vi.spyOn(repository, 'cancel')];
  await act(async () => {
    await expect(result.current.timeOff.submitTimeOffRequest(draft)).rejects.toThrow('Sign in as an employee');
    await expect(result.current.timeOff.reviewTimeOffRequest('one', 'approved', '')).rejects.toThrow(
      'Sign in as a supervisor',
    );
    await expect(result.current.timeOff.cancelTimeOffRequest('one')).rejects.toThrow('Sign in as an employee');
  });
  for (const command of commands) expect(command).not.toHaveBeenCalled();

  act(() => result.current.session.signIn(employee));
  await act(async () => {
    await expect(result.current.timeOff.reviewTimeOffRequest('one', 'approved', '')).rejects.toThrow(
      'Sign in as a supervisor',
    );
  });
  for (const command of commands) expect(command).not.toHaveBeenCalled();
  await act(async () => result.current.timeOff.submitTimeOffRequest(draft));
  const created = result.current.timeOff.timeOffRequests[0];
  expect(created).toMatchObject({ employeeKey: 'alex', note: 'Family trip', status: 'pending' });
  expect(created.id).toEqual(expect.any(String));
  expect(created.createdAt).toBe('2026-11-12T12:00:00.000Z');
  act(() => result.current.session.signIn({ role: 'supervisor' }));
  for (const command of commands) command.mockClear();
  await act(async () => {
    await expect(result.current.timeOff.submitTimeOffRequest(draft)).rejects.toThrow('Sign in as an employee');
    await expect(result.current.timeOff.cancelTimeOffRequest(created.id)).rejects.toThrow('Sign in as an employee');
  });
  for (const command of commands) expect(command).not.toHaveBeenCalled();
  await act(async () => result.current.timeOff.reviewTimeOffRequest(created.id, 'approved', ' Enjoy your break '));
  expect((await repository.load())[0]).toMatchObject({ status: 'approved', reviewerNote: 'Enjoy your break' });

  act(() => result.current.session.signOut());
  for (const command of commands) command.mockClear();
  await act(async () => {
    await expect(result.current.timeOff.reviewTimeOffRequest(created.id, 'rejected', '')).rejects.toThrow(
      'Sign in as a supervisor',
    );
  });
  for (const command of commands) expect(command).not.toHaveBeenCalled();
});

test('validates submission against time off requests saved after the displayed snapshot was loaded', async () => {
  const { result, repository } = await renderTimeOff(employee);
  saveTimeOffRequests([timeOffRequest]);
  expect(result.current.timeOff.timeOffRequests).toEqual([]);
  await act(async () => {
    await expect(result.current.timeOff.submitTimeOffRequest(draft)).rejects.toBeInstanceOf(
      TimeOffRequestValidationError,
    );
  });
  expect(await repository.load()).toEqual([timeOffRequest]);
  expect(result.current.timeOff.busy).toBe(false);
});

test('rejects a decision when another update has already reviewed the displayed time off request', async () => {
  const { result, repository } = await renderTimeOff({ role: 'supervisor' });
  saveTimeOffRequests([timeOffRequest]);
  await act(async () => result.current.timeOff.reload());
  const reviewed: TimeOffRequest = {
    ...timeOffRequest,
    status: 'rejected',
    reviewedAt: '2026-11-12T11:00:00Z',
    reviewerNote: 'Existing decision',
  };
  saveTimeOffRequests([reviewed]);
  expect(result.current.timeOff.timeOffRequests[0].status).toBe('pending');
  await act(async () => {
    await expect(result.current.timeOff.reviewTimeOffRequest(timeOffRequest.id, 'approved', '')).rejects.toBeInstanceOf(
      TimeOffRequestDecisionError,
    );
  });
  expect(await repository.load()).toEqual([reviewed]);
});

test('preserves both context values and actions across an unrelated parent render', async () => {
  const { result, rerender } = await renderTimeOff(employee);
  const initial = result.current;
  rerender();
  expect(result.current.session).toBe(initial.session);
  expect(result.current.timeOff).toBe(initial.timeOff);
});

test('time off request state updates do not render a consumer subscribed only to session context', async () => {
  const repository = createTimeOffRequestRepository(() => localStorage);
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
  await waitFor(() => expect(result.current.loading).toBe(false));
  const renderCount = observeSession.mock.calls.length;
  await act(async () => result.current.submitTimeOffRequest(draft));
  expect(result.current.timeOffRequests).toHaveLength(1);
  expect(observeSession).toHaveBeenCalledTimes(renderCount);
  await act(async () => result.current.reload());
  expect(observeSession).toHaveBeenCalledTimes(renderCount);
});

test('requires a time-off provider', () => {
  expect(() => renderHook(() => useTimeOff())).toThrow('useTimeOff requires TimeOffProvider.');
});

test('cancels the latest approved time off request while preserving its review details', async () => {
  const { result, repository } = await renderTimeOff(employee);
  const future: TimeOffRequest = { ...timeOffRequest, startDate: '2026-11-13', endDate: '2026-11-16' };
  saveTimeOffRequests([future]);
  await act(async () => result.current.timeOff.reload());
  saveTimeOffRequests([
    { ...future, status: 'approved', reviewedAt: '2026-11-12T11:00:00Z', reviewerNote: 'Enjoy your break' },
  ]);
  expect(result.current.timeOff.timeOffRequests[0].status).toBe('pending');
  await act(async () => result.current.timeOff.cancelTimeOffRequest(future.id));
  expect((await repository.load())[0]).toMatchObject({
    status: 'cancelled',
    cancelledFromDate: '2026-11-13',
    cancelledAt: '2026-11-12T12:00:00.000Z',
    reviewedAt: '2026-11-12T11:00:00Z',
    reviewerNote: 'Enjoy your break',
  });
  expect(result.current.timeOff.timeOffRequests).toEqual(await repository.load());
});

test('rejects another employee and stale cancellation attempts against the latest saved data', async () => {
  const { result, repository } = await renderTimeOff(employee);
  const future: TimeOffRequest = { ...timeOffRequest, startDate: '2026-11-13', endDate: '2026-11-16' };
  saveTimeOffRequests([future]);
  await act(async () => result.current.timeOff.reload());
  for (const saved of [
    [],
    [{ ...future, employeeName: 'Bob', employeeKey: 'bob' }],
    [{ ...future, status: 'rejected' as const, reviewedAt: '2026-11-12T11:00:00Z' }],
    [{ ...future, status: 'cancelled' as const, cancelledFromDate: future.startDate, cancelledAt: future.createdAt }],
  ]) {
    saveTimeOffRequests(saved);
    await act(async () => {
      await expect(result.current.timeOff.cancelTimeOffRequest(future.id)).rejects.toBeInstanceOf(
        TimeOffRequestCancellationError,
      );
    });
    expect(await repository.load()).toEqual(saved);
    expect(result.current.timeOff.busy).toBe(false);
  }
});

test('partially cancels ongoing leave and preserves it after a failed write for retry', async () => {
  const { result, repository } = await renderTimeOff(employee);
  saveTimeOffRequests([timeOffRequest]);
  await act(async () => result.current.timeOff.reload());
  const write = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new DOMException('Storage full', 'QuotaExceededError');
  });
  await act(async () => {
    await expect(result.current.timeOff.cancelTimeOffRequest(timeOffRequest.id)).rejects.toThrow(
      'Your changes could not be saved',
    );
  });
  expect(result.current.timeOff.timeOffRequests).toEqual([timeOffRequest]);
  expect(await repository.load()).toEqual([timeOffRequest]);
  expect(result.current.timeOff.busy).toBe(false);
  write.mockRestore();
  await act(async () => result.current.timeOff.cancelTimeOffRequest(timeOffRequest.id));
  expect((await repository.load())[0]).toMatchObject({
    status: 'pending',
    startDate: timeOffRequest.startDate,
    endDate: timeOffRequest.endDate,
    cancelledFromDate: '2026-11-13',
    cancelledAt: '2026-11-12T12:00:00.000Z',
  });
});
