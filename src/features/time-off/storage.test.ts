import { beforeEach, expect, test, vi } from 'vitest';

import { createRequestRepository, createSessionRepository } from './storage';
import type { TimeOffRequest } from './timeOff';

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
  sessionStorage.clear();
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

test('restores simulated sessions and removes them on sign out', () => {
  const repository = createSessionRepository(() => sessionStorage);
  expect(repository.load()).toBeNull();
  repository.save({ role: 'employee', name: 'Alex', employeeKey: 'alex' });
  expect(repository.load()).toEqual({ role: 'employee', name: 'Alex', employeeKey: 'alex' });
  repository.save({ role: 'supervisor' });
  expect(repository.load()).toEqual({ role: 'supervisor' });
  repository.save(null);
  expect(repository.load()).toBeNull();
});
