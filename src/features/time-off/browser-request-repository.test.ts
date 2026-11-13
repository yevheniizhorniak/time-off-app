import { beforeEach, expect, test, vi } from 'vitest';

import { createRequestRepository } from './browser-request-repository';
import type { TimeOffRequest } from './time-off-domain';

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

beforeEach(() => {
  localStorage.clear();
});

test('starts empty and preserves existing requests when applying later changes', async () => {
  const repository = createRequestRepository(() => localStorage);
  expect(repository.load()).toEqual([]);
  await repository.update(() => [request]);
  await repository.update((current) => [
    ...current,
    { ...request, id: 'two', employeeKey: 'bob', employeeName: 'Bob' },
  ]);
  expect(repository.load().map((item) => item.id)).toEqual(['one', 'two']);
  await repository.update((current) =>
    current.map((item) =>
      item.id === 'one'
        ? {
            ...item,
            status: 'approved',
            reviewerNote: 'Enjoy your break',
            reviewedAt: '2026-11-12T09:00:00Z',
          }
        : item,
    ),
  );
  expect(repository.load()[0]).toMatchObject({ status: 'approved', reviewerNote: 'Enjoy your break' });
});

test('invalid saved data cannot be silently overwritten', async () => {
  localStorage.setItem('time-off-app.requests', '{broken');
  const repository = createRequestRepository(() => localStorage);
  expect(() => repository.load()).toThrow();
  await expect(repository.update(() => [request])).rejects.toThrow();
  expect(localStorage.getItem('time-off-app.requests')).toBe('{broken');
  for (const requests of [
    [{ ...request, endDate: '2026-11-01' }],
    [request, request],
    [{ ...request, status: 'approved' }],
  ]) {
    localStorage.setItem('time-off-app.requests', JSON.stringify({ version: 1, requests }));
    expect(() => repository.load()).toThrow();
  }
});

test('failed writes reject without changing the saved requests', async () => {
  const repository = createRequestRepository(() => localStorage);
  await repository.update(() => [request]);
  const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new DOMException('Storage full', 'QuotaExceededError');
  });
  try {
    await expect(repository.update(() => [])).rejects.toThrow('Storage full');
  } finally {
    setItem.mockRestore();
  }
  expect(repository.load()).toEqual([request]);
});

test('refreshes only for request storage changes and unsubscribes cleanly', () => {
  const onChange = vi.fn();
  const unsubscribe = createRequestRepository(() => localStorage).subscribe(onChange);
  window.dispatchEvent(new StorageEvent('storage', { key: 'unrelated' }));
  expect(onChange).not.toHaveBeenCalled();
  window.dispatchEvent(new StorageEvent('storage', { key: 'time-off-app.requests' }));
  expect(onChange).toHaveBeenCalledOnce();
  unsubscribe();
  window.dispatchEvent(new StorageEvent('storage', { key: null }));
  expect(onChange).toHaveBeenCalledOnce();
});

test('loads existing version-1 records and round-trips full and partial cancellation history', async () => {
  const repository = createRequestRepository(() => localStorage);
  localStorage.setItem('time-off-app.requests', JSON.stringify({ version: 1, requests: [request] }));
  expect(repository.load()).toEqual([request]);
  for (const saved of [
    { ...request, status: 'cancelled' as const, cancelledFromDate: request.startDate },
    {
      ...request,
      status: 'cancelled' as const,
      cancelledFromDate: request.startDate,
      reviewedAt: '2026-11-10T11:00:00Z',
      reviewerNote: 'Approved earlier',
    },
    { ...request, cancelledFromDate: request.endDate },
    { ...request, status: 'approved' as const, reviewedAt: '2026-11-10T11:00:00Z', cancelledFromDate: request.endDate },
    { ...request, status: 'rejected' as const, reviewedAt: '2026-11-12T13:00:00Z', cancelledFromDate: request.endDate },
  ]) {
    const cancelled = { ...saved, cancelledAt: '2026-11-11T12:00:00Z' };
    await repository.update(() => [cancelled]);
    expect(repository.load()).toEqual([cancelled]);
  }
});

test('rejects incomplete, invalid and inconsistent cancellation metadata without overwriting it', async () => {
  const repository = createRequestRepository(() => localStorage);
  const cancelled = {
    ...request,
    status: 'cancelled',
    cancelledFromDate: request.startDate,
    cancelledAt: '2026-11-11T12:00:00Z',
  };
  for (const saved of [
    { ...request, status: 'cancelled' },
    { ...cancelled, cancelledFromDate: undefined },
    { ...cancelled, cancelledAt: undefined },
    { ...cancelled, cancelledAt: 'invalid' },
    { ...cancelled, cancelledFromDate: '2026-02-30' },
    { ...cancelled, cancelledFromDate: '2026-11-11' },
    { ...cancelled, cancelledFromDate: '2026-11-16' },
    { ...cancelled, cancelledFromDate: request.endDate },
    { ...cancelled, status: 'pending' },
    { ...cancelled, reviewedAt: 'invalid' },
  ]) {
    const raw = JSON.stringify({ version: 1, requests: [saved] });
    localStorage.setItem('time-off-app.requests', raw);
    expect(() => repository.load()).toThrow();
    await expect(repository.update(() => [])).rejects.toThrow();
    expect(localStorage.getItem('time-off-app.requests')).toBe(raw);
  }
});
