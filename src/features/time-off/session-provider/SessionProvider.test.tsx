import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, expect, test, vi } from 'vitest';

import { createSessionRepository, type SessionRepository } from '../browser-storage-repositories';
import type { Session } from '../time-off-domain';
import { useSession } from '../useSession';

import SessionProvider from './SessionProvider';

const employee: Session = { role: 'employee', name: 'Alex', employeeKey: 'alex' };

beforeEach(() => {
  sessionStorage.clear();
});

function renderSession(repository: SessionRepository) {
  return renderHook(() => useSession(), {
    wrapper: ({ children }: { children: ReactNode }) => (
      <SessionProvider repository={repository}>{children}</SessionProvider>
    ),
  });
}

test('restores a saved session and persists sign-in and sign-out before publishing them', () => {
  const repository = createSessionRepository(() => sessionStorage);
  repository.save(employee);
  const { result } = renderSession(repository);
  expect(result.current.session).toEqual(employee);
  expect(result.current.sessionError).toBeNull();

  act(() => result.current.signIn({ role: 'supervisor' }));
  expect(result.current.session).toEqual(repository.load());
  expect(result.current.session).toEqual({ role: 'supervisor' });
  act(() => result.current.signOut());
  expect(result.current.session).toBeNull();
  expect(repository.load()).toBeNull();
});

test('recovers from an unreadable session after a successful sign-in', () => {
  sessionStorage.setItem('time-off-app.session', '{broken');
  const repository = createSessionRepository(() => sessionStorage);
  const { result } = renderSession(repository);
  expect(result.current.session).toBeNull();
  expect(result.current.sessionError).toBe('Your previous session could not be restored. Please sign in again.');
  act(() => result.current.signIn(employee));
  expect(result.current.session).toEqual(employee);
  expect(result.current.sessionError).toBeNull();
  expect(repository.load()).toEqual(employee);
});

test('failed session writes preserve the active session and allow retry', () => {
  const saved = createSessionRepository(() => sessionStorage);
  saved.save(employee);
  const save = vi.fn<SessionRepository['save']>(() => {
    throw new Error('Storage unavailable');
  });
  const { result } = renderSession({ load: saved.load, save });
  const original = result.current;
  act(() => {
    expect(() => result.current.signIn({ role: 'supervisor' })).toThrow('Your login could not be saved');
    expect(() => result.current.signOut()).toThrow('Your session could not be cleared');
  });
  expect(result.current).toBe(original);
  expect(saved.load()).toEqual(employee);
  save.mockImplementation(saved.save);
  act(() => result.current.signOut());
  expect(result.current.session).toBeNull();
  expect(saved.load()).toBeNull();
});

test('requires a session provider', () => {
  expect(() => renderHook(() => useSession())).toThrow('useSession requires SessionProvider.');
});
