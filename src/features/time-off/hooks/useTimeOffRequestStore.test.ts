import { act, renderHook, waitFor } from '@testing-library/react';
import { expect, test, vi } from 'vitest';

import type { TimeOffRequest } from '../types/time-off-request';
import {
  TimeOffRequestCancellationError,
  TimeOffRequestDecisionError,
  TimeOffRequestValidationError,
} from '../types/time-off-request-errors';
import type { TimeOffRequestRepository } from '../types/time-off-request-repository';

import { useTimeOffRequestStore } from './useTimeOffRequestStore';

const timeOffRequest: TimeOffRequest = {
  id: 'one',
  employeeKey: 'alex',
  employeeName: 'Alex',
  startDate: '2026-11-12',
  endDate: '2026-11-13',
  leaveType: 'sick-day',
  note: '',
  status: 'pending',
  createdAt: '2026-11-12T08:00:00Z',
};

function createRepository() {
  const unsubscribe = vi.fn();
  return {
    load: vi.fn<TimeOffRequestRepository['load']>().mockResolvedValue([]),
    submit: vi.fn<TimeOffRequestRepository['submit']>().mockResolvedValue([timeOffRequest]),
    review: vi.fn<TimeOffRequestRepository['review']>().mockResolvedValue([]),
    cancel: vi.fn<TimeOffRequestRepository['cancel']>().mockResolvedValue([]),
    subscribe: vi.fn<TimeOffRequestRepository['subscribe']>(() => unsubscribe),
    unsubscribe,
  };
}

test('loads after mounting and distinguishes an initial load from an empty collection', async () => {
  const repository = createRepository();
  const pending = Promise.withResolvers<TimeOffRequest[]>();
  repository.load.mockReturnValue(pending.promise);
  const { result } = renderHook(() => useTimeOffRequestStore(repository));
  expect(result.current).toMatchObject({ loading: true, hasLoaded: false, busy: false, timeOffRequests: [] });
  await waitFor(() => expect(repository.load).toHaveBeenCalledOnce());
  await act(async () => pending.resolve([]));
  expect(result.current).toMatchObject({ loading: false, hasLoaded: true, loadError: null, timeOffRequests: [] });
});

test('reports an initial failure and recovers through retry', async () => {
  const repository = createRepository();
  repository.load.mockRejectedValueOnce(new Error('Offline'));
  const { result } = renderHook(() => useTimeOffRequestStore(repository));
  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(result.current).toMatchObject({ hasLoaded: false, timeOffRequests: [] });
  expect(result.current.loadError).toContain('could not be loaded');
  repository.load.mockResolvedValue([timeOffRequest]);
  await act(async () => result.current.reload());
  expect(result.current).toMatchObject({
    hasLoaded: true,
    loading: false,
    loadError: null,
    timeOffRequests: [timeOffRequest],
  });
});

test('preserves the last snapshot during a refresh and on refresh failure, then recovers from an external change', async () => {
  const repository = createRepository();
  repository.load.mockResolvedValueOnce([timeOffRequest]);
  const { result, unmount } = renderHook(() => useTimeOffRequestStore(repository));
  await waitFor(() => expect(result.current.loading).toBe(false));
  const refresh = Promise.withResolvers<TimeOffRequest[]>();
  repository.load.mockReturnValueOnce(refresh.promise);
  act(() => result.current.reload());
  expect(result.current).toMatchObject({ loading: true, hasLoaded: true, timeOffRequests: [timeOffRequest] });
  await act(async () => refresh.reject(new Error('Offline')));
  expect(result.current).toMatchObject({ loading: false, timeOffRequests: [timeOffRequest] });
  expect(result.current.loadError).toContain('could not be loaded');
  const notify = repository.subscribe.mock.calls[0][0];
  await act(async () => notify());
  expect(result.current).toMatchObject({ timeOffRequests: [], loadError: null, hasLoaded: true });
  unmount();
  expect(repository.unsubscribe).toHaveBeenCalledOnce();
});

test('serializes a delayed read, a command, and an external refresh in invocation order', async () => {
  const repository = createRepository();
  const initial = Promise.withResolvers<TimeOffRequest[]>();
  const saved = Promise.withResolvers<TimeOffRequest[]>();
  repository.load.mockReturnValueOnce(initial.promise).mockResolvedValue([timeOffRequest]);
  repository.submit.mockReturnValue(saved.promise);
  const { result } = renderHook(() => useTimeOffRequestStore(repository));
  await waitFor(() => expect(repository.load).toHaveBeenCalledOnce());
  let saving!: Promise<void>;
  act(() => {
    saving = result.current.persist(() => repository.submit(timeOffRequest, { name: 'Alex', employeeKey: 'alex' }));
    repository.subscribe.mock.calls[0][0]();
  });
  expect(result.current).toMatchObject({ busy: true, loading: true });
  expect(repository.submit).not.toHaveBeenCalled();
  await act(async () => initial.resolve([]));
  expect(repository.submit).toHaveBeenCalledOnce();
  expect(repository.load).toHaveBeenCalledOnce();
  expect(result.current.timeOffRequests).toEqual([]);
  await act(async () => {
    saved.resolve([timeOffRequest]);
    await saving;
  });
  expect(repository.load).toHaveBeenCalledTimes(2);
  expect(result.current).toMatchObject({ busy: false, loading: false, timeOffRequests: [timeOffRequest] });
});

test('keeps queued writes busy and continues after a failed command while preserving its cause', async () => {
  const repository = createRepository();
  repository.load.mockResolvedValue([timeOffRequest]);
  const { result } = renderHook(() => useTimeOffRequestStore(repository));
  await waitFor(() => expect(result.current.loading).toBe(false));
  const first = Promise.withResolvers<TimeOffRequest[]>();
  const second = Promise.withResolvers<TimeOffRequest[]>();
  const laterCommand = vi.fn(() => second.promise);
  const failure = new Error('Offline');
  let failing!: Promise<unknown>;
  let saving!: Promise<void>;
  act(() => {
    failing = result.current.persist(() => first.promise).catch((error: unknown) => error);
    saving = result.current.persist(laterCommand);
  });
  expect(result.current.busy).toBe(true);
  expect(laterCommand).not.toHaveBeenCalled();
  await act(async () => {
    first.reject(failure);
    expect(await failing).toMatchObject({
      message: 'Your changes could not be saved. Please try again.',
      cause: failure,
    });
  });
  expect(laterCommand).toHaveBeenCalledOnce();
  expect(result.current).toMatchObject({ busy: true, timeOffRequests: [timeOffRequest] });
  await act(async () => {
    second.resolve([]);
    await saving;
  });
  expect(result.current).toMatchObject({ busy: false, timeOffRequests: [] });
});

test('preserves typed domain failures and permits a subsequent retry', async () => {
  const repository = createRepository();
  const { result } = renderHook(() => useTimeOffRequestStore(repository));
  await waitFor(() => expect(result.current.loading).toBe(false));
  for (const failure of [
    new TimeOffRequestValidationError({ startDate: 'Overlap' }),
    new TimeOffRequestDecisionError(),
    new TimeOffRequestCancellationError(),
  ]) {
    await act(async () => {
      await expect(result.current.persist(() => Promise.reject(failure))).rejects.toBe(failure);
    });
    expect(result.current).toMatchObject({ busy: false, timeOffRequests: [] });
  }
  await act(async () => result.current.persist(() => Promise.resolve([timeOffRequest])));
  expect(result.current.timeOffRequests).toEqual([timeOffRequest]);
});

test.each(['resolve', 'reject'] as const)('ignores an old repository load that later %ss', async (outcome) => {
  const oldRepository = createRepository();
  const oldLoad = Promise.withResolvers<TimeOffRequest[]>();
  oldRepository.load.mockReturnValue(oldLoad.promise);
  const { result, rerender } = renderHook(({ repository }) => useTimeOffRequestStore(repository), {
    initialProps: { repository: oldRepository },
  });
  await waitFor(() => expect(oldRepository.load).toHaveBeenCalledOnce());
  const oldActions = result.current;
  const replacement = createRepository();
  replacement.load.mockResolvedValue([timeOffRequest]);
  rerender({ repository: replacement });
  expect(result.current).toMatchObject({ loading: true, hasLoaded: false, timeOffRequests: [] });
  await waitFor(() => expect(result.current.loading).toBe(false));
  await act(async () => {
    if (outcome === 'resolve') oldLoad.resolve([]);
    else oldLoad.reject(new Error('Old failure'));
    oldActions.reload();
    await expect(oldActions.persist(() => Promise.resolve([]))).rejects.toThrow('no longer active');
  });
  expect(oldRepository.unsubscribe).toHaveBeenCalledOnce();
  expect(oldRepository.load).toHaveBeenCalledOnce();
  expect(result.current).toMatchObject({
    timeOffRequests: [timeOffRequest],
    loadError: null,
    hasLoaded: true,
    loading: false,
  });
});

test('ignores in-flight commands from a replaced repository', async () => {
  const oldRepository = createRepository();
  const { result, rerender } = renderHook(({ repository }) => useTimeOffRequestStore(repository), {
    initialProps: { repository: oldRepository },
  });
  await waitFor(() => expect(result.current.loading).toBe(false));
  const command = Promise.withResolvers<TimeOffRequest[]>();
  let saving!: Promise<void>;
  act(() => {
    saving = result.current.persist(() => command.promise);
  });
  await act(async () => {
    await Promise.resolve();
  });
  const replacement = createRepository();
  rerender({ repository: replacement });
  await waitFor(() => expect(result.current.loading).toBe(false));
  await act(async () => {
    command.resolve([timeOffRequest]);
    await saving;
  });
  expect(result.current).toMatchObject({ timeOffRequests: [], busy: false, hasLoaded: true });
});

test('unsubscribes and prevents queued commands and notifications from running after unmount', async () => {
  const repository = createRepository();
  const pending = Promise.withResolvers<TimeOffRequest[]>();
  repository.load.mockReturnValue(pending.promise);
  const { result, unmount } = renderHook(() => useTimeOffRequestStore(repository));
  await waitFor(() => expect(repository.load).toHaveBeenCalledOnce());
  const command = vi.fn(() => Promise.resolve([timeOffRequest]));
  let saving!: Promise<unknown>;
  act(() => {
    saving = result.current.persist(command).catch((error: unknown) => error);
  });
  const notify = repository.subscribe.mock.calls[0][0];
  unmount();
  await act(async () => {
    pending.resolve([]);
    expect(await saving).toBeInstanceOf(Error);
    notify();
  });
  expect(command).not.toHaveBeenCalled();
  expect(repository.unsubscribe).toHaveBeenCalledOnce();
  expect(repository.load).toHaveBeenCalledOnce();
});

test('supports the Strict Mode setup/cleanup cycle without accepting results from a retired lifecycle', async () => {
  const repository = createRepository();
  repository.load.mockResolvedValue([timeOffRequest]);
  const { result, unmount } = renderHook(() => useTimeOffRequestStore(repository), {
    reactStrictMode: true,
  });
  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(result.current.timeOffRequests).toEqual([timeOffRequest]);
  expect(repository.subscribe).toHaveBeenCalledTimes(2);
  unmount();
  expect(repository.unsubscribe).toHaveBeenCalledTimes(2);
});
