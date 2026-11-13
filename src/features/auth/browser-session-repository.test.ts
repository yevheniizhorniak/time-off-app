import { beforeEach, expect, test } from 'vitest';

import { createSessionRepository } from './browser-session-repository';

beforeEach(() => {
  sessionStorage.clear();
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

test('trims employee names when restoring saved sessions', () => {
  sessionStorage.setItem(
    'time-off-app.session',
    JSON.stringify({ role: 'employee', name: '  ALex  ', employeeKey: 'alex', extra: 'ignored' }),
  );
  const repository = createSessionRepository(() => sessionStorage);
  expect(repository.load()).toEqual({ role: 'employee', name: 'ALex', employeeKey: 'alex' });
});

test.each([
  null,
  [],
  { role: 'admin' },
  { role: 'employee', name: '', employeeKey: '' },
  { role: 'employee', name: '   ', employeeKey: '' },
  { role: 'employee', name: 'Alex', employeeKey: 'bob' },
  { role: 'employee', name: 'Alex' },
])('rejects invalid saved sessions %j', (session) => {
  const raw = JSON.stringify(session);
  sessionStorage.setItem('time-off-app.session', raw);
  const repository = createSessionRepository(() => sessionStorage);
  expect(() => repository.load()).toThrow('Saved session is invalid.');
  expect(sessionStorage.getItem('time-off-app.session')).toBe(raw);
});
