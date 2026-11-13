import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';

import { getInitialTheme } from '../../theme/theme-preference';
import ThemeProvider from '../../theme/theme-provider/ThemeProvider';

import { ToaThemeButton } from './ThemeButton';

beforeEach(() => {
  window.localStorage.removeItem('toa-theme');
  delete document.documentElement.dataset.theme;
  document.documentElement.style.removeProperty('color-scheme');
});

afterEach(() => {
  vi.restoreAllMocks();
  window.localStorage.removeItem('toa-theme');
  delete document.documentElement.dataset.theme;
  document.documentElement.style.removeProperty('color-scheme');
});

test.each([false, true])('uses the OS preference when dark mode is %s without saving it', (darkMode) => {
  vi.spyOn(window, 'matchMedia').mockReturnValue({
    ...window.matchMedia('(prefers-color-scheme: dark)'),
    matches: darkMode,
  });
  render(
    <ThemeProvider>
      <ToaThemeButton />
    </ThemeProvider>,
  );

  expect(document.documentElement.style.colorScheme).toBe(darkMode ? 'dark' : 'light');
  expect(document.documentElement.dataset.theme).toBe(darkMode ? 'dark' : 'light');
  expect(window.localStorage.getItem('toa-theme')).toBeNull();
});

test.each(['light', 'dark'] as const)('restores a saved %s theme ahead of the OS preference', (theme) => {
  window.localStorage.setItem('toa-theme', theme);
  vi.spyOn(window, 'matchMedia').mockReturnValue({
    ...window.matchMedia('(prefers-color-scheme: dark)'),
    matches: theme === 'light',
  });

  expect(getInitialTheme()).toBe(theme);
});

test('ignores an invalid saved theme', () => {
  window.localStorage.setItem('toa-theme', 'invalid');
  expect(getInitialTheme()).toBe('light');
});

test('shares toggles across mounted buttons and persists both directions', () => {
  render(
    <ThemeProvider>
      <ToaThemeButton />
      <ToaThemeButton />
    </ThemeProvider>,
  );

  fireEvent.click(screen.getAllByRole('button', { name: 'Switch to dark theme' })[0]);
  expect(screen.getAllByRole('button', { name: 'Switch to light theme' })).toHaveLength(2);
  expect(document.documentElement.style.colorScheme).toBe('dark');
  expect(document.documentElement.dataset.theme).toBe('dark');
  expect(window.localStorage.getItem('toa-theme')).toBe('dark');

  fireEvent.click(screen.getAllByRole('button', { name: 'Switch to light theme' })[1]);
  expect(screen.getAllByRole('button', { name: 'Switch to dark theme' })).toHaveLength(2);
  expect(document.documentElement.style.colorScheme).toBe('light');
  expect(document.documentElement.dataset.theme).toBe('light');
  expect(window.localStorage.getItem('toa-theme')).toBe('light');
});

test('allows toggling when storage access fails', () => {
  vi.spyOn(window, 'localStorage', 'get').mockImplementation(() => {
    throw new Error('Storage unavailable');
  });
  render(
    <ThemeProvider>
      <ToaThemeButton />
    </ThemeProvider>,
  );

  fireEvent.click(screen.getByRole('button', { name: 'Switch to dark theme' }));
  expect(document.documentElement.style.colorScheme).toBe('dark');
  fireEvent.click(screen.getByRole('button', { name: 'Switch to light theme' }));
  expect(document.documentElement.style.colorScheme).toBe('light');
});

test('allows toggling when storage writes fail', () => {
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new Error('Storage full');
  });
  render(
    <ThemeProvider>
      <ToaThemeButton />
    </ThemeProvider>,
  );

  fireEvent.click(screen.getByRole('button', { name: 'Switch to dark theme' }));
  expect(document.documentElement.style.colorScheme).toBe('dark');
  expect(window.localStorage.getItem('toa-theme')).toBeNull();
});
