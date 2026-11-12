import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';

import { createRequestRepository } from './browser-storage-repositories';
import { RequestDecisionError, RequestValidationError, type TimeOffRequest } from './time-off-domain';
import { useRequestStore } from './useRequestStore';

const request: TimeOffRequest = {
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

beforeEach(() => localStorage.clear());
afterEach(() => vi.restoreAllMocks());

test('loads saved requests, preserves them on read failure, and recovers with reload', async () => {
  const repository = createRequestRepository(() => localStorage);
  await repository.update(() => [request]);
  const { result } = renderHook(() => useRequestStore(repository));
  expect(result.current.requests).toEqual([request]);
  localStorage.setItem('time-off-app.requests', '{broken');
  act(() => result.current.reload());
  expect(result.current.storageError).toContain('Saved requests could not be read');
  expect(result.current.requests).toEqual([request]);
  localStorage.removeItem('time-off-app.requests');
  act(() => result.current.reload());
  expect(result.current.storageError).toBeNull();
  expect(result.current.requests).toEqual([]);
});

test('reports an initial read failure and recovers through storage notifications', async () => {
  localStorage.setItem('time-off-app.requests', '{broken');
  const repository = createRequestRepository(() => localStorage);
  const { result, unmount } = renderHook(() => useRequestStore(repository));
  const removeListener = vi.spyOn(window, 'removeEventListener');
  expect(result.current.requests).toEqual([]);
  expect(result.current.storageError).toContain('Saved requests could not be read');
  localStorage.removeItem('time-off-app.requests');
  await repository.update(() => [request]);
  act(() => window.dispatchEvent(new StorageEvent('storage', { key: 'time-off-app.requests' })));
  expect(result.current.requests).toEqual([request]);
  expect(result.current.storageError).toBeNull();
  localStorage.setItem('time-off-app.requests', '{broken');
  act(() => window.dispatchEvent(new StorageEvent('storage', { key: 'time-off-app.requests' })));
  expect(result.current.requests).toEqual([request]);
  expect(result.current.storageError).toContain('Saved requests could not be read');
  unmount();
  expect(removeListener).toHaveBeenCalledWith('storage', expect.any(Function));
});

test('failed saves preserve requests and the original cause, then allow retry', async () => {
  const repository = createRequestRepository(() => localStorage);
  await repository.update(() => [request]);
  const { result } = renderHook(() => useRequestStore(repository));
  const failure = new DOMException('Storage full', 'QuotaExceededError');
  const write = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw failure;
  });
  await act(async () => {
    await expect(result.current.persist(() => [])).rejects.toMatchObject({
      message: 'Your changes could not be saved. Check browser storage access and try again.',
      cause: failure,
    });
  });
  expect(result.current.requests).toEqual([request]);
  expect(repository.load()).toEqual([request]);
  expect(result.current.busy).toBe(false);
  write.mockRestore();
  await act(async () => result.current.persist(() => []));
  expect(result.current.requests).toEqual([]);
  expect(repository.load()).toEqual([]);
});

test('preserves typed validation and decision failures without publishing a change', async () => {
  const repository = createRequestRepository(() => localStorage);
  const { result } = renderHook(() => useRequestStore(repository));
  for (const failure of [new RequestValidationError({ startDate: 'Overlap' }), new RequestDecisionError()]) {
    await act(async () => {
      await expect(
        result.current.persist(() => {
          throw failure;
        }),
      ).rejects.toBe(failure);
    });
    expect(result.current.busy).toBe(false);
    expect(result.current.requests).toEqual([]);
    expect(repository.load()).toEqual([]);
  }
});

test.each(['success', 'failure'] as const)(
  'stays busy until both overlapping operations settle when %s finishes first',
  async (first) => {
    const repository = createRequestRepository(() => localStorage);
    const originalUpdate = repository.update;
    const success = Promise.withResolvers<void>();
    const failure = Promise.withResolvers<TimeOffRequest[]>();
    vi.spyOn(repository, 'update')
      .mockImplementationOnce(async (change) => {
        await success.promise;
        return originalUpdate(change);
      })
      .mockImplementationOnce(() => failure.promise);
    const { result } = renderHook(() => useRequestStore(repository));
    let saving: Promise<void>;
    let failing: Promise<unknown>;
    act(() => {
      saving = result.current.persist(() => [request]);
      failing = result.current.persist(() => []).catch((error: unknown) => error);
    });
    expect(result.current.busy).toBe(true);
    await act(async () => {
      if (first === 'success') {
        success.resolve();
        await saving;
      } else {
        failure.reject(new Error('Storage full'));
        await failing;
      }
    });
    expect(result.current.busy).toBe(true);
    await act(async () => {
      success.resolve();
      failure.reject(new Error('Storage full'));
      await saving;
      expect(await failing).toBeInstanceOf(Error);
    });
    expect(result.current.busy).toBe(false);
    expect(result.current.requests).toEqual([request]);
    expect(repository.load()).toEqual([request]);
  },
);
