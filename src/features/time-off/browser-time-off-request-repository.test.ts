import { beforeEach, expect, test, vi } from 'vitest';

import { createTimeOffRequestRepository } from './browser-time-off-request-repository';
import type { TimeOffRequest } from './types/time-off-request';

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

beforeEach(() => {
  localStorage.clear();
});

test('starts empty and preserves existing time off requests when applying later changes', async () => {
  const repository = createTimeOffRequestRepository(() => localStorage);
  expect(repository.load()).toEqual([]);
  await repository.update(() => [timeOffRequest]);
  await repository.update((current) => [
    ...current,
    { ...timeOffRequest, id: 'two', employeeKey: 'bob', employeeName: 'Bob' },
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

test('serializes updates with the canonical storage key when Web Locks are available', async () => {
  const lock = vi.fn(async (_name: string, commit: () => TimeOffRequest[]) => commit());
  vi.stubGlobal('navigator', { locks: { request: lock } });
  try {
    const repository = createTimeOffRequestRepository(() => localStorage);
    await repository.update(() => [timeOffRequest]);
    expect(lock).toHaveBeenCalledWith('time-off-app.time-off-requests', expect.any(Function));
    expect(repository.load()).toEqual([timeOffRequest]);
  } finally {
    vi.unstubAllGlobals();
  }
});

test('invalid saved data cannot be silently overwritten', async () => {
  localStorage.setItem('time-off-app.time-off-requests', '{broken');
  const repository = createTimeOffRequestRepository(() => localStorage);
  expect(() => repository.load()).toThrow();
  await expect(repository.update(() => [timeOffRequest])).rejects.toThrow();
  expect(localStorage.getItem('time-off-app.time-off-requests')).toBe('{broken');
  for (const timeOffRequests of [
    [{ ...timeOffRequest, endDate: '2026-11-01' }],
    [timeOffRequest, timeOffRequest],
    [{ ...timeOffRequest, status: 'approved' }],
  ]) {
    localStorage.setItem('time-off-app.time-off-requests', JSON.stringify({ version: 2, timeOffRequests }));
    expect(() => repository.load()).toThrow();
  }
});

test('failed writes reject without changing the saved time off requests', async () => {
  const repository = createTimeOffRequestRepository(() => localStorage);
  await repository.update(() => [timeOffRequest]);
  const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new DOMException('Storage full', 'QuotaExceededError');
  });
  try {
    await expect(repository.update(() => [])).rejects.toThrow('Storage full');
  } finally {
    setItem.mockRestore();
  }
  expect(repository.load()).toEqual([timeOffRequest]);
});

test('refreshes only for time off request storage changes and unsubscribes cleanly', () => {
  const onChange = vi.fn();
  const unsubscribe = createTimeOffRequestRepository(() => localStorage).subscribe(onChange);
  window.dispatchEvent(new StorageEvent('storage', { key: 'unrelated' }));
  expect(onChange).not.toHaveBeenCalled();
  window.dispatchEvent(new StorageEvent('storage', { key: 'time-off-app.time-off-requests' }));
  expect(onChange).toHaveBeenCalledOnce();
  window.dispatchEvent(new StorageEvent('storage', { key: 'time-off-app.requests' }));
  expect(onChange).toHaveBeenCalledTimes(2);
  window.dispatchEvent(new StorageEvent('storage', { key: null }));
  expect(onChange).toHaveBeenCalledTimes(3);
  unsubscribe();
  window.dispatchEvent(new StorageEvent('storage', { key: 'time-off-app.time-off-requests' }));
  window.dispatchEvent(new StorageEvent('storage', { key: 'time-off-app.requests' }));
  window.dispatchEvent(new StorageEvent('storage', { key: null }));
  expect(onChange).toHaveBeenCalledTimes(3);
});

test('loads legacy data without writing and migrates on the next successful save', async () => {
  const legacyRaw = JSON.stringify({ version: 1, requests: [timeOffRequest] });
  localStorage.setItem('time-off-app.requests', legacyRaw);
  const repository = createTimeOffRequestRepository(() => localStorage);
  expect(repository.load()).toEqual([timeOffRequest]);
  expect(localStorage.getItem('time-off-app.time-off-requests')).toBeNull();
  const second = { ...timeOffRequest, id: 'two', employeeKey: 'bob', employeeName: 'Bob' };
  await repository.update((current) => [...current, second]);
  expect(JSON.parse(localStorage.getItem('time-off-app.time-off-requests')!)).toEqual({
    version: 2,
    timeOffRequests: [timeOffRequest, second],
  });
  expect(localStorage.getItem('time-off-app.requests')).toBe(legacyRaw);
  expect(repository.load()).toEqual([timeOffRequest, second]);
});

test('preserves legacy data when migration fails and allows retry', async () => {
  const legacyRaw = JSON.stringify({ version: 1, requests: [timeOffRequest] });
  localStorage.setItem('time-off-app.requests', legacyRaw);
  const repository = createTimeOffRequestRepository(() => localStorage);
  const write = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new DOMException('Storage full', 'QuotaExceededError');
  });
  try {
    await expect(repository.update(() => [])).rejects.toThrow('Storage full');
    expect(localStorage.getItem('time-off-app.time-off-requests')).toBeNull();
    expect(localStorage.getItem('time-off-app.requests')).toBe(legacyRaw);
    expect(repository.load()).toEqual([timeOffRequest]);
  } finally {
    write.mockRestore();
  }
  await repository.update(() => []);
  expect(repository.load()).toEqual([]);
});

test.each([{ timeOffRequests: [] }, { timeOffRequests: [{ ...timeOffRequest, id: 'current' }] }])(
  'uses current data instead of a legacy backup, including an empty collection: %j',
  ({ timeOffRequests }) => {
    const repository = createTimeOffRequestRepository(() => localStorage);
    localStorage.setItem('time-off-app.requests', JSON.stringify({ version: 1, requests: [timeOffRequest] }));
    localStorage.setItem('time-off-app.time-off-requests', JSON.stringify({ version: 2, timeOffRequests }));
    expect(repository.load()).toEqual(timeOffRequests);
    localStorage.setItem('time-off-app.requests', '{broken');
    expect(repository.load()).toEqual(timeOffRequests);
  },
);

test.each([
  '{broken',
  JSON.stringify({ version: 1, timeOffRequests: [timeOffRequest] }),
  JSON.stringify({ version: 2, requests: [timeOffRequest] }),
  JSON.stringify({ version: 2, timeOffRequests: null }),
])('rejects invalid current data without falling back to legacy data: %s', async (raw) => {
  const legacyRaw = JSON.stringify({ version: 1, requests: [timeOffRequest] });
  localStorage.setItem('time-off-app.requests', legacyRaw);
  localStorage.setItem('time-off-app.time-off-requests', raw);
  const repository = createTimeOffRequestRepository(() => localStorage);
  expect(() => repository.load()).toThrow();
  await expect(repository.update(() => [])).rejects.toThrow();
  expect(localStorage.getItem('time-off-app.time-off-requests')).toBe(raw);
  expect(localStorage.getItem('time-off-app.requests')).toBe(legacyRaw);
});

test.each([
  '{broken',
  JSON.stringify({ version: 2, requests: [timeOffRequest] }),
  JSON.stringify({ version: 1, timeOffRequests: [timeOffRequest] }),
  JSON.stringify({ version: 1, requests: [timeOffRequest, timeOffRequest] }),
  JSON.stringify({ version: 1, requests: [{ ...timeOffRequest, endDate: 'invalid' }] }),
])('preserves invalid legacy data instead of migrating or overwriting it: %s', async (raw) => {
  localStorage.setItem('time-off-app.requests', raw);
  const repository = createTimeOffRequestRepository(() => localStorage);
  expect(() => repository.load()).toThrow();
  await expect(repository.update(() => [])).rejects.toThrow();
  expect(localStorage.getItem('time-off-app.requests')).toBe(raw);
  expect(localStorage.getItem('time-off-app.time-off-requests')).toBeNull();
});

test('loads version-2 records and round-trips full and partial cancellation history', async () => {
  const repository = createTimeOffRequestRepository(() => localStorage);
  localStorage.setItem(
    'time-off-app.time-off-requests',
    JSON.stringify({ version: 2, timeOffRequests: [timeOffRequest] }),
  );
  expect(repository.load()).toEqual([timeOffRequest]);
  for (const saved of [
    { ...timeOffRequest, status: 'cancelled' as const, cancelledFromDate: timeOffRequest.startDate },
    {
      ...timeOffRequest,
      status: 'cancelled' as const,
      cancelledFromDate: timeOffRequest.startDate,
      reviewedAt: '2026-11-10T11:00:00Z',
      reviewerNote: 'Approved earlier',
    },
    { ...timeOffRequest, cancelledFromDate: timeOffRequest.endDate },
    {
      ...timeOffRequest,
      status: 'approved' as const,
      reviewedAt: '2026-11-10T11:00:00Z',
      cancelledFromDate: timeOffRequest.endDate,
    },
    {
      ...timeOffRequest,
      status: 'rejected' as const,
      reviewedAt: '2026-11-12T13:00:00Z',
      cancelledFromDate: timeOffRequest.endDate,
    },
  ]) {
    const cancelled = { ...saved, cancelledAt: '2026-11-11T12:00:00Z' };
    await repository.update(() => [cancelled]);
    expect(repository.load()).toEqual([cancelled]);
  }
});

test('rejects incomplete, invalid and inconsistent cancellation metadata without overwriting it', async () => {
  const repository = createTimeOffRequestRepository(() => localStorage);
  const cancelled = {
    ...timeOffRequest,
    status: 'cancelled',
    cancelledFromDate: timeOffRequest.startDate,
    cancelledAt: '2026-11-11T12:00:00Z',
  };
  for (const saved of [
    { ...timeOffRequest, status: 'cancelled' },
    { ...cancelled, cancelledFromDate: undefined },
    { ...cancelled, cancelledAt: undefined },
    { ...cancelled, cancelledAt: 'invalid' },
    { ...cancelled, cancelledFromDate: '2026-02-30' },
    { ...cancelled, cancelledFromDate: '2026-11-11' },
    { ...cancelled, cancelledFromDate: '2026-11-16' },
    { ...cancelled, cancelledFromDate: timeOffRequest.endDate },
    { ...cancelled, status: 'pending' },
    { ...cancelled, reviewedAt: 'invalid' },
  ]) {
    const raw = JSON.stringify({ version: 2, timeOffRequests: [saved] });
    localStorage.setItem('time-off-app.time-off-requests', raw);
    expect(() => repository.load()).toThrow();
    await expect(repository.update(() => [])).rejects.toThrow();
    expect(localStorage.getItem('time-off-app.time-off-requests')).toBe(raw);
  }
});
