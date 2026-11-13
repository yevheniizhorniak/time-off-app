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
