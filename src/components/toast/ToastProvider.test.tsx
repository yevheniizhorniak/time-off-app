import { act, cleanup, fireEvent, render, renderHook, screen, within } from '@testing-library/react';
import { StrictMode, type ReactNode } from 'react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';

import { ToaToastProvider } from './ToastProvider';
import { useToast } from './useToast';

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'performance'] });
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

function wrapper({ children }: { children: ReactNode }): React.JSX.Element {
  return (
    <StrictMode>
      <ToaToastProvider>{children}</ToaToastProvider>
    </StrictMode>
  );
}

function stack(): HTMLElement {
  return document.querySelector<HTMLElement>('.toa-toast-stack')!;
}

function advance(milliseconds: number): void {
  act(() => vi.advanceTimersByTime(milliseconds));
}

test('requires a provider and explains how to fix missing context', () => {
  expect(() => renderHook(() => useToast())).toThrow('useToast must be used within a ToaToastProvider.');
});

test('portals an ordered stack, preserves repeated messages, and keeps announcements separate', () => {
  const { result } = renderHook(() => useToast(), { wrapper });
  const log = screen.getByRole('log', { name: 'Notifications' });
  expect(log).toBeEmptyDOMElement();
  expect(log).toHaveAttribute('aria-live', 'polite');
  expect(log).toHaveAttribute('aria-relevant', 'additions');
  expect(log).toHaveAttribute('aria-atomic', 'false');

  let ids: string[] = [];
  act(() => {
    ids = [result.current.showToast('First'), result.current.showToast('Second'), result.current.showToast('First')];
  });

  expect(new Set(ids).size).toBe(3);
  expect(Array.from(stack().querySelectorAll('p'), (message) => message.textContent)).toEqual([
    'First',
    'Second',
    'First',
  ]);
  expect(within(log).getAllByText('First')).toHaveLength(2);
  expect(within(log).queryByRole('button')).not.toBeInTheDocument();
  expect(screen.getByRole('log')).toBe(log);
  expect(stack().parentElement).toBe(document.body);
});

test('each notification expires five seconds after it appears without resetting older timers', () => {
  const { result } = renderHook(() => useToast(), { wrapper });
  act(() => {
    result.current.showToast('First');
  });
  advance(2000);
  act(() => {
    result.current.showToast('Second');
  });
  advance(2999);
  expect(within(stack()).getByText('First')).toBeInTheDocument();
  advance(1);
  expect(within(stack()).queryByText('First')).not.toBeInTheDocument();
  expect(within(stack()).getByText('Second')).toBeInTheDocument();
  advance(2000);
  expect(stack()).toBeEmptyDOMElement();
  expect(screen.getByRole('log')).toBeEmptyDOMElement();
});

test('manual and programmatic dismissal affect only their notification and cancel its timer', () => {
  const { result } = renderHook(() => useToast(), { wrapper });
  let secondId = '';
  act(() => {
    result.current.showToast('First');
    secondId = result.current.showToast('Second');
    result.current.showToast('Third');
  });
  expect(vi.getTimerCount()).toBe(3);

  fireEvent.click(within(stack()).getAllByRole('button', { name: 'Dismiss notification' })[0]);
  expect(within(stack()).queryByText('First')).not.toBeInTheDocument();
  expect(vi.getTimerCount()).toBe(2);

  act(() => {
    result.current.dismissToast(secondId);
    result.current.dismissToast(secondId);
    result.current.dismissToast('unknown');
  });
  expect(within(stack()).queryByText('Second')).not.toBeInTheDocument();
  expect(within(stack()).getByText('Third')).toBeInTheDocument();
  expect(vi.getTimerCount()).toBe(1);
});

test('hover pauses only its own clock and resumes with the remaining time', () => {
  const { result } = renderHook(() => useToast(), { wrapper });
  act(() => {
    result.current.showToast('Paused');
    result.current.showToast('Running');
  });
  advance(2000);
  const item = within(stack()).getByText('Paused').closest('.toa-toast-stack__item')!;
  fireEvent.mouseEnter(item);
  advance(10000);
  expect(within(stack()).getByText('Paused')).toBeInTheDocument();
  expect(within(stack()).queryByText('Running')).not.toBeInTheDocument();
  fireEvent.mouseLeave(item);
  advance(2999);
  expect(within(stack()).getByText('Paused')).toBeInTheDocument();
  advance(1);
  expect(stack()).toBeEmptyDOMElement();
});

test('focus and hover must both leave before the remaining timer resumes', () => {
  const { result } = renderHook(() => useToast(), { wrapper });
  act(() => {
    result.current.showToast('Paused');
  });
  advance(1000);
  const button = within(stack()).getByRole('button', { name: 'Dismiss notification' });
  const item = button.closest('.toa-toast-stack__item')!;
  fireEvent.mouseEnter(item);
  act(() => button.focus());
  fireEvent.mouseLeave(item);
  advance(10000);
  expect(button).toHaveFocus();
  expect(within(stack()).getByText('Paused')).toBeInTheDocument();
  act(() => button.blur());
  advance(3999);
  expect(within(stack()).getByText('Paused')).toBeInTheDocument();
  advance(1);
  expect(stack()).toBeEmptyDOMElement();
});

test('leaving focus does not resume a clock while the notification is still hovered', () => {
  const { result } = renderHook(() => useToast(), { wrapper });
  act(() => {
    result.current.showToast('Paused');
  });
  const button = within(stack()).getByRole('button', { name: 'Dismiss notification' });
  const item = button.closest('.toa-toast-stack__item')!;
  act(() => button.focus());
  fireEvent.mouseEnter(item);
  act(() => button.blur());
  advance(6000);
  expect(within(stack()).getByText('Paused')).toBeInTheDocument();
  fireEvent.mouseLeave(item);
  advance(5000);
  expect(stack()).toBeEmptyDOMElement();
});

test('showing notifications preserves keyboard focus', () => {
  render(<button type="button">Trigger</button>);
  const trigger = screen.getByRole('button', { name: 'Trigger' });
  trigger.focus();
  const { result } = renderHook(() => useToast(), { wrapper });
  act(() => {
    result.current.showToast('Request submitted');
  });
  expect(trigger).toHaveFocus();
});

test('unmounting removes portal content and cancels running and paused timers', () => {
  const { result, unmount } = renderHook(() => useToast(), { wrapper });
  act(() => {
    result.current.showToast('Paused');
    result.current.showToast('Running');
  });
  fireEvent.mouseEnter(within(stack()).getByText('Paused').closest('.toa-toast-stack__item')!);
  expect(vi.getTimerCount()).toBe(1);
  unmount();
  expect(vi.getTimerCount()).toBe(0);
  expect(screen.queryByRole('log')).not.toBeInTheDocument();
  expect(document.querySelector('.toa-toast-stack')).not.toBeInTheDocument();
  advance(10000);
});
