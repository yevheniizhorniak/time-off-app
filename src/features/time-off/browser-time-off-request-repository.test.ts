import { afterEach, beforeEach, expect, test, vi } from 'vitest';

import { createTimeOffRequestRepository } from './browser-time-off-request-repository';
import { createDemoTimeOffRequests } from './demo-time-off-requests';
import type { TimeOffRequest } from './types/time-off-request';
import type { TimeOffRequestDraft } from './types/time-off-request-draft';
import {
  TimeOffRequestValidationError,
  TimeOffRequestDecisionError,
  TimeOffRequestCancellationError,
} from './types/time-off-request-errors';

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

const employee = { name: 'Alex', employeeKey: 'alex' };
const draft: TimeOffRequestDraft = {
  startDate: '2026-11-12',
  endDate: '2026-11-13',
  leaveType: 'sick-day',
  note: ' Family trip ',
};

function saveTimeOffRequests(timeOffRequests: unknown[]): void {
  localStorage.setItem('time-off-app.time-off-requests', JSON.stringify({ version: 2, timeOffRequests }));
}

beforeEach(() => {
  localStorage.clear();
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-11-12T12:00:00Z'));
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

test('persists initial examples once and preserves dates and decisions on later loads', async () => {
  const initialize = vi.fn(() => createDemoTimeOffRequests(new Date()));
  const repository = createTimeOffRequestRepository(() => localStorage, initialize);
  const examples = await repository.load();
  expect(examples).toHaveLength(3);
  expect(JSON.parse(localStorage.getItem('time-off-app.time-off-requests')!)).toEqual({
    version: 2,
    timeOffRequests: examples,
  });
  const pending = examples.find(({ status }) => status === 'pending')!;
  const reviewed = await repository.review(pending.id, 'approved', 'Demo reviewed');
  vi.setSystemTime(new Date('2027-01-03T12:00:00Z'));
  expect(await createTimeOffRequestRepository(() => localStorage, initialize).load()).toEqual(reviewed);
  expect(initialize).toHaveBeenCalledOnce();
});

test.each(['reject', 'cancel'] as const)(
  'persists exclusions from latest storage even after older leave is %s',
  async (action) => {
    const repository = createTimeOffRequestRepository(() => localStorage);
    await repository.load();
    const older = { ...timeOffRequest, startDate: '2026-11-13', endDate: '2026-11-16' };
    saveTimeOffRequests([older]);
    const saved = await repository.submit({ ...draft, startDate: '2026-11-12', endDate: '2026-11-18' }, employee);
    const spanning = saved[1];
    expect(spanning.excludedDates).toEqual(['2026-11-13', '2026-11-16']);
    if (action === 'reject') await repository.review(older.id, 'rejected', '');
    else await repository.cancel(older.id, 'alex');
    await repository.review(spanning.id, 'approved', '');
    const restored = await createTimeOffRequestRepository(() => localStorage).load();
    expect(restored[1]).toMatchObject({ status: 'approved', excludedDates: ['2026-11-13', '2026-11-16'] });
  },
);

test.each([
  null,
  '2026-11-13',
  ['invalid'],
  ['2026-11-12'],
  ['2026-11-20'],
  ['2026-11-21'],
  ['2026-11-14'],
  ['2026-11-17'],
  ['2026-11-13', '2026-11-13'],
  ['2026-11-16', '2026-11-13'],
])('rejects malformed saved exclusions: %j', async (excludedDates) => {
  saveTimeOffRequests([{ ...timeOffRequest, endDate: '2026-11-20', excludedDates }]);
  await expect(createTimeOffRequestRepository(() => localStorage).load()).rejects.toThrow('unsupported format');
});

test.each([{ saved: [] }, { saved: [timeOffRequest] }])(
  'preserves existing collections instead of initializing: %j',
  async ({ saved }) => {
    saveTimeOffRequests(saved);
    const initialize = vi.fn(() => createDemoTimeOffRequests(new Date()));
    expect(await createTimeOffRequestRepository(() => localStorage, initialize).load()).toEqual(saved);
    expect(initialize).not.toHaveBeenCalled();
  },
);

test('preserves corrupt storage without invoking the initial-data factory', async () => {
  localStorage.setItem('time-off-app.time-off-requests', '{broken');
  const initialize = vi.fn(() => createDemoTimeOffRequests(new Date()));
  await expect(createTimeOffRequestRepository(() => localStorage, initialize).load()).rejects.toThrow();
  expect(initialize).not.toHaveBeenCalled();
  expect(localStorage.getItem('time-off-app.time-off-requests')).toBe('{broken');
});

test('reports failed initialization writes and allows retry', async () => {
  const repository = createTimeOffRequestRepository(
    () => localStorage,
    () => createDemoTimeOffRequests(new Date()),
  );
  const failure = new DOMException('Storage full', 'QuotaExceededError');
  const write = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw failure;
  });
  await expect(repository.load()).rejects.toBe(failure);
  expect(localStorage.getItem('time-off-app.time-off-requests')).toBeNull();
  write.mockRestore();
  expect(await repository.load()).toHaveLength(3);
});

test('reports initial-data factory failures without persisting a collection', async () => {
  const failure = new Error('Cannot generate examples');
  const repository = createTimeOffRequestRepository(
    () => localStorage,
    () => {
      throw failure;
    },
  );
  await expect(repository.load()).rejects.toBe(failure);
  expect(localStorage.getItem('time-off-app.time-off-requests')).toBeNull();
});

test('initializes a command before the first load without losing examples', async () => {
  const repository = createTimeOffRequestRepository(
    () => localStorage,
    () => createDemoTimeOffRequests(new Date()),
  );
  const submitted = await repository.submit(draft, employee);
  expect(submitted).toHaveLength(4);
  expect(submitted.filter(({ employeeKey }) => employeeKey === 'testusr')).toHaveLength(3);
  expect(await repository.load()).toEqual(submitted);
});

test('rechecks initialization inside the same lock used by commands', async () => {
  const granted = Promise.withResolvers<void>();
  let queue = granted.promise;
  const lock = vi.fn((_name: string, commit: () => TimeOffRequest[]) => {
    const result = queue.then(commit);
    queue = result.then(() => undefined);
    return result;
  });
  vi.stubGlobal('navigator', { locks: { request: lock } });
  const initialize = vi.fn(() => createDemoTimeOffRequests(new Date()));
  const first = createTimeOffRequestRepository(() => localStorage, initialize);
  const second = createTimeOffRequestRepository(() => localStorage, initialize);
  const loading = first.load();
  const submitting = second.submit(draft, employee);
  const alsoLoading = second.load();
  granted.resolve();
  expect(await loading).toHaveLength(3);
  const submitted = await submitting;
  expect(submitted).toHaveLength(4);
  expect(await alsoLoading).toEqual(submitted);
  expect(initialize).toHaveBeenCalledOnce();
  expect(lock).toHaveBeenCalledTimes(3);
  expect(lock).toHaveBeenCalledWith('time-off-app.time-off-requests', expect.any(Function));
});

test('does not overwrite data written while initialization waits for its lock', async () => {
  const granted = Promise.withResolvers<void>();
  vi.stubGlobal('navigator', {
    locks: {
      request: async (_name: string, commit: () => TimeOffRequest[]) => {
        await granted.promise;
        return commit();
      },
    },
  });
  const initialize = vi.fn(() => createDemoTimeOffRequests(new Date()));
  const loading = createTimeOffRequestRepository(() => localStorage, initialize).load();
  saveTimeOffRequests([timeOffRequest]);
  granted.resolve();
  expect(await loading).toEqual([timeOffRequest]);
  expect(initialize).not.toHaveBeenCalled();
});

test('submits and reviews against the latest collection, returning persisted snapshots', async () => {
  const repository = createTimeOffRequestRepository(() => localStorage);
  expect(await repository.load()).toEqual([]);
  const [created] = await repository.submit(draft, employee);
  expect(created).toMatchObject({
    employeeKey: 'alex',
    employeeName: 'Alex',
    note: 'Family trip',
    status: 'pending',
    createdAt: '2026-11-12T12:00:00.000Z',
  });
  expect(created.id).toEqual(expect.any(String));
  const submitted = await repository.submit(draft, { name: 'Bob', employeeKey: 'bob' });
  expect(submitted).toHaveLength(2);
  expect(submitted[0]).toEqual(created);
  const reviewed = await repository.review(created.id, 'approved', ' Enjoy your break ');
  expect(reviewed[0]).toMatchObject({
    status: 'approved',
    reviewerNote: 'Enjoy your break',
    reviewedAt: '2026-11-12T12:00:00.000Z',
  });
  expect(await repository.load()).toEqual(reviewed);
  await expect(repository.submit(draft, employee)).rejects.toBeInstanceOf(TimeOffRequestValidationError);
  await expect(repository.review(created.id, 'rejected', '')).rejects.toBeInstanceOf(TimeOffRequestDecisionError);
  await expect(repository.cancel(created.id, 'bob')).rejects.toBeInstanceOf(TimeOffRequestCancellationError);
  expect(await repository.load()).toEqual(reviewed);
});

test('cancels ongoing and future leave while retaining review history and preventing repeat cancellation', async () => {
  const repository = createTimeOffRequestRepository(() => localStorage);
  saveTimeOffRequests([timeOffRequest]);
  await repository.review(timeOffRequest.id, 'approved', 'Approved earlier');
  const partial = await repository.cancel(timeOffRequest.id, employee.employeeKey);
  expect(partial[0]).toMatchObject({
    status: 'approved',
    cancelledFromDate: '2026-11-13',
    reviewerNote: 'Approved earlier',
    cancelledAt: '2026-11-12T12:00:00.000Z',
  });
  await expect(repository.cancel(timeOffRequest.id, employee.employeeKey)).rejects.toBeInstanceOf(
    TimeOffRequestCancellationError,
  );
  const [, future] = await repository.submit({ ...draft, startDate: '2026-11-16', endDate: '2026-11-18' }, employee);
  const full = await repository.cancel(future.id, employee.employeeKey);
  expect(full[1]).toMatchObject({ status: 'cancelled', cancelledFromDate: '2026-11-16' });
  expect(await repository.load()).toEqual(full);
});

test('serializes every command with the canonical storage key when Web Locks are available', async () => {
  const lock = vi.fn(async (_name: string, commit: () => TimeOffRequest[]) => commit());
  vi.stubGlobal('navigator', { locks: { request: lock } });
  const repository = createTimeOffRequestRepository(() => localStorage);
  const [created] = await repository.submit(draft, employee);
  await repository.review(created.id, 'approved', '');
  await repository.cancel(created.id, employee.employeeKey);
  expect(lock).toHaveBeenCalledTimes(3);
  expect(lock).toHaveBeenCalledWith('time-off-app.time-off-requests', expect.any(Function));
});

test('validates data changed while a command is waiting for its Web Lock', async () => {
  const granted = Promise.withResolvers<void>();
  const lock = vi.fn(async (_name: string, commit: () => TimeOffRequest[]) => {
    await granted.promise;
    return commit();
  });
  vi.stubGlobal('navigator', { locks: { request: lock } });
  const repository = createTimeOffRequestRepository(() => localStorage);
  const submitting = repository.submit(draft, employee);
  const rejected = expect(submitting).rejects.toBeInstanceOf(TimeOffRequestValidationError);
  saveTimeOffRequests([timeOffRequest]);
  granted.resolve();
  await rejected;
  expect(await repository.load()).toEqual([timeOffRequest]);
});

test('invalid saved data cannot be silently overwritten by any command', async () => {
  const repository = createTimeOffRequestRepository(() => localStorage);
  for (const raw of [
    '{broken',
    ...[
      [{ ...timeOffRequest, endDate: '2026-11-01' }],
      [timeOffRequest, timeOffRequest],
      [{ ...timeOffRequest, status: 'approved' }],
    ].map((timeOffRequests) => JSON.stringify({ version: 2, timeOffRequests })),
  ]) {
    localStorage.setItem('time-off-app.time-off-requests', raw);
    await expect(repository.load()).rejects.toThrow();
    await expect(repository.submit(draft, employee)).rejects.toThrow();
    await expect(repository.review('one', 'approved', '')).rejects.toThrow();
    await expect(repository.cancel('one', employee.employeeKey)).rejects.toThrow();
    expect(localStorage.getItem('time-off-app.time-off-requests')).toBe(raw);
  }
});

test('failed writes reject with the original cause and preserve saved data for retry', async () => {
  const repository = createTimeOffRequestRepository(() => localStorage);
  saveTimeOffRequests([timeOffRequest]);
  const failure = new DOMException('Storage full', 'QuotaExceededError');
  const write = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw failure;
  });
  await expect(repository.review('one', 'approved', '')).rejects.toBe(failure);
  expect(await repository.load()).toEqual([timeOffRequest]);
  write.mockRestore();
  expect((await repository.review('one', 'approved', ''))[0].status).toBe('approved');
});

test('refreshes only for time off request storage changes and unsubscribes cleanly', () => {
  const onChange = vi.fn();
  const unsubscribe = createTimeOffRequestRepository(() => localStorage).subscribe(onChange);
  window.dispatchEvent(new StorageEvent('storage', { key: 'unrelated' }));
  expect(onChange).not.toHaveBeenCalled();
  window.dispatchEvent(new StorageEvent('storage', { key: 'time-off-app.time-off-requests' }));
  expect(onChange).toHaveBeenCalledOnce();
  window.dispatchEvent(new StorageEvent('storage', { key: 'time-off-app.requests' }));
  expect(onChange).toHaveBeenCalledOnce();
  window.dispatchEvent(new StorageEvent('storage', { key: null }));
  expect(onChange).toHaveBeenCalledTimes(2);
  unsubscribe();
  window.dispatchEvent(new StorageEvent('storage', { key: 'time-off-app.time-off-requests' }));
  window.dispatchEvent(new StorageEvent('storage', { key: 'time-off-app.requests' }));
  window.dispatchEvent(new StorageEvent('storage', { key: null }));
  expect(onChange).toHaveBeenCalledTimes(2);
});

test.each([JSON.stringify({ version: 1, requests: [timeOffRequest] }), '{broken'])(
  'ignores the retired storage key when loading and saving: %s',
  async (raw) => {
    localStorage.setItem('time-off-app.requests', raw);
    const repository = createTimeOffRequestRepository(() => localStorage);
    expect(await repository.load()).toEqual([]);
    const created = await repository.submit(draft, employee);
    expect(await repository.load()).toEqual(created);
    expect(JSON.parse(localStorage.getItem('time-off-app.time-off-requests')!)).toEqual({
      version: 2,
      timeOffRequests: created,
    });
    expect(localStorage.getItem('time-off-app.requests')).toBe(raw);
  },
);

test.each([{ timeOffRequests: [] }, { timeOffRequests: [timeOffRequest] }])(
  'loads the saved collection: %j',
  async ({ timeOffRequests }) => {
    const repository = createTimeOffRequestRepository(() => localStorage);
    localStorage.setItem('time-off-app.time-off-requests', JSON.stringify({ version: 2, timeOffRequests }));
    expect(await repository.load()).toEqual(timeOffRequests);
  },
);

test.each([
  '{broken',
  JSON.stringify({ version: 1, timeOffRequests: [timeOffRequest] }),
  JSON.stringify({ version: 1, requests: [timeOffRequest] }),
  JSON.stringify({ version: 2, requests: [timeOffRequest] }),
  JSON.stringify({ version: 2, timeOffRequests: null }),
])('rejects unsupported saved formats without overwriting them: %s', async (raw) => {
  localStorage.setItem('time-off-app.time-off-requests', raw);
  const repository = createTimeOffRequestRepository(() => localStorage);
  await expect(repository.load()).rejects.toThrow();
  await expect(repository.review('one', 'approved', '')).rejects.toThrow();
  expect(localStorage.getItem('time-off-app.time-off-requests')).toBe(raw);
});

test('loads version-2 records and round-trips full and partial cancellation history', async () => {
  const repository = createTimeOffRequestRepository(() => localStorage);
  localStorage.setItem(
    'time-off-app.time-off-requests',
    JSON.stringify({ version: 2, timeOffRequests: [timeOffRequest] }),
  );
  expect(await repository.load()).toEqual([timeOffRequest]);
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
    saveTimeOffRequests([cancelled]);
    await repository.submit(draft, { name: 'Bob', employeeKey: 'bob' });
    expect((await repository.load())[0]).toEqual(cancelled);
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
    await expect(repository.load()).rejects.toThrow();
    await expect(repository.review('one', 'approved', '')).rejects.toThrow();
    expect(localStorage.getItem('time-off-app.time-off-requests')).toBe(raw);
  }
});
