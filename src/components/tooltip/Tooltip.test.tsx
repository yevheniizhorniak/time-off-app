import { act, fireEvent, render, screen } from '@testing-library/react';
import { createRef } from 'react';
import { afterEach, expect, test, vi } from 'vitest';

import Button from '../button/Button';

import Tooltip from './Tooltip';

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function pointer(
  target: Element,
  event: string,
  pointerType = 'mouse',
  relatedTarget: EventTarget | null = null,
): void {
  const nativeEvent = new MouseEvent(event, { bubbles: true, relatedTarget });
  Object.defineProperty(nativeEvent, 'pointerType', { value: pointerType });
  fireEvent(target, nativeEvent);
}

function renderTooltip() {
  const result = render(
    <Tooltip content="Optional extra information">
      <button type="button">Help</button>
    </Tooltip>,
  );
  return { ...result, trigger: screen.getByRole('button', { name: 'Help' }) };
}

test('preserves the trigger name, ref, descriptions and actions without adding a tab stop', () => {
  const onClick = vi.fn();
  const ref = createRef<HTMLButtonElement>();
  const { container } = render(
    <>
      <p id="existing-description">Existing help</p>
      <Tooltip content="Extra help">
        <Button aria-describedby="existing-description" label="Help" onClick={onClick} ref={ref} />
      </Tooltip>
    </>,
  );

  const trigger = screen.getByRole('button', { name: 'Help' });
  const tooltip = screen.getByRole('tooltip', { hidden: true });
  expect(tooltip).not.toBeVisible();
  expect(tooltip.parentElement).toBe(document.body);
  expect(trigger).toHaveAttribute('aria-describedby', `existing-description ${tooltip.id}`);
  expect(trigger).toHaveAccessibleDescription('Existing help Extra help');
  expect(ref.current).toBe(trigger);
  expect(container.querySelector('[tabindex]')).toBeNull();
  fireEvent.click(trigger);
  expect(onClick).toHaveBeenCalledOnce();
});

test('stays open while moving from the trigger across the gap onto the tooltip', () => {
  vi.useFakeTimers();
  const { trigger } = renderTooltip();
  pointer(trigger, 'pointerover');
  const tooltip = screen.getByRole('tooltip');
  pointer(trigger, 'pointerout');
  act(() => {
    vi.advanceTimersByTime(100);
  });
  expect(tooltip).toBeVisible();
  pointer(tooltip, 'pointerover');
  act(() => {
    vi.advanceTimersByTime(1000);
  });
  expect(tooltip).toBeVisible();
  pointer(tooltip, 'pointerout');
  act(() => {
    vi.advanceTimersByTime(200);
  });
  expect(tooltip).not.toBeVisible();
});

test('opens on focus, survives pointer exit, and Escape dismisses without moving focus or reopening', () => {
  vi.useFakeTimers();
  const { trigger } = renderTooltip();
  act(() => {
    trigger.focus();
  });
  const tooltip = screen.getByRole('tooltip');
  pointer(trigger, 'pointerover');
  pointer(trigger, 'pointerout');
  act(() => {
    vi.advanceTimersByTime(200);
  });
  expect(tooltip).toBeVisible();
  fireEvent.keyDown(trigger, { key: 'Escape' });
  expect(trigger).toHaveFocus();
  act(() => {
    vi.advanceTimersByTime(1000);
  });
  expect(tooltip).not.toBeVisible();
  pointer(trigger, 'pointerover');
  expect(tooltip).toBeVisible();
  act(() => {
    trigger.blur();
  });
  expect(tooltip).not.toBeVisible();
  act(() => {
    trigger.focus();
  });
  expect(tooltip).toBeVisible();
});

test.each(['touch', 'pen'])(
  '%s toggles once per activation despite generated focus and remains open without a timeout',
  (pointerType) => {
    vi.useFakeTimers();
    const { trigger } = renderTooltip();
    pointer(trigger, 'pointerover', pointerType);
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    pointer(trigger, 'pointerdown', pointerType);
    act(() => {
      trigger.focus();
    });
    pointer(trigger, 'pointerup', pointerType);
    fireEvent.click(trigger);
    const tooltip = screen.getByRole('tooltip');
    pointer(trigger, 'pointerout', pointerType);
    act(() => {
      vi.advanceTimersByTime(60_000);
    });
    expect(tooltip).toBeVisible();
    pointer(trigger, 'pointerdown', pointerType);
    pointer(trigger, 'pointerup', pointerType);
    fireEvent.click(trigger);
    expect(tooltip).not.toBeVisible();
    expect(trigger).toHaveFocus();
    pointer(trigger, 'pointerdown', pointerType);
    fireEvent.click(trigger);
    expect(tooltip).toBeVisible();
  },
);

test('dismisses on outside pointer interaction or focus change without blocking outside actions', () => {
  const onClick = vi.fn();
  render(
    <>
      <Tooltip content="Help text">
        <button type="button">Help</button>
      </Tooltip>
      <button onClick={onClick}>Outside</button>
    </>,
  );
  const trigger = screen.getByRole('button', { name: 'Help' });
  const outside = screen.getByRole('button', { name: 'Outside' });
  pointer(trigger, 'pointerover');
  const tooltip = screen.getByRole('tooltip');
  pointer(outside, 'pointerdown', 'touch');
  fireEvent.click(outside);
  expect(tooltip).not.toBeVisible();
  expect(onClick).toHaveBeenCalledOnce();
  pointer(trigger, 'pointerout');
  pointer(trigger, 'pointerover');
  expect(tooltip).toBeVisible();
  act(() => {
    outside.focus();
  });
  expect(tooltip).not.toBeVisible();
});

test('supports independent tooltip instances with unique descriptions', () => {
  render(
    <>
      <Tooltip content="First description">
        <button>First</button>
      </Tooltip>
      <Tooltip content="Second description">
        <button>Second</button>
      </Tooltip>
    </>,
  );
  const first = screen.getByRole('button', { name: 'First' });
  const second = screen.getByRole('button', { name: 'Second' });
  expect(first.getAttribute('aria-describedby')).not.toBe(second.getAttribute('aria-describedby'));
  act(() => {
    first.focus();
  });
  expect(screen.getByRole('tooltip')).toHaveTextContent('First description');
  act(() => {
    second.focus();
  });
  expect(screen.getByRole('tooltip')).toHaveTextContent('Second description');
});

test('still works when the child stops event propagation', () => {
  render(
    <Tooltip content="Help text">
      <button onClick={(event) => event.stopPropagation()} onFocus={(event) => event.stopPropagation()}>
        Help
      </button>
    </Tooltip>,
  );
  const trigger = screen.getByRole('button', { name: 'Help' });
  act(() => {
    trigger.focus();
  });
  expect(screen.getByRole('tooltip')).toBeVisible();
  fireEvent.keyDown(trigger, { key: 'Escape' });
  pointer(trigger, 'pointerdown', 'touch');
  fireEvent.click(trigger);
  expect(screen.getByRole('tooltip')).toBeVisible();
});

test('cancelled touch activation does not change the next mouse activation', () => {
  const { trigger } = renderTooltip();
  pointer(trigger, 'pointerdown', 'touch');
  pointer(trigger, 'pointercancel', 'touch');
  act(() => {
    trigger.focus();
  });
  expect(screen.getByRole('tooltip')).toBeVisible();
  pointer(trigger, 'pointerdown');
  fireEvent.click(trigger);
  expect(screen.getByRole('tooltip')).toBeVisible();
});

test('flips below the top edge, clamps horizontally, and follows scroll, resize and content changes', () => {
  vi.spyOn(document.documentElement, 'clientWidth', 'get').mockReturnValue(320);
  vi.spyOn(document.documentElement, 'clientHeight', 'get').mockReturnValue(640);
  let triggerTop = 10;
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
    return this.classList.contains('toa-tooltip')
      ? { left: 0, top: 0, right: 200, bottom: 50, width: 200, height: 50, x: 0, y: 0, toJSON: () => ({}) }
      : {
          left: 280,
          right: 320,
          top: triggerTop,
          bottom: triggerTop + 44,
          width: 40,
          height: 44,
          x: 280,
          y: triggerTop,
          toJSON: () => ({}),
        };
  });
  const { trigger, rerender } = renderTooltip();
  act(() => {
    trigger.focus();
  });
  const tooltip = screen.getByRole('tooltip');
  expect(tooltip).toHaveStyle({ left: '112px', top: '62px' });
  expect(tooltip.style.maxWidth).toBe('min(20rem, 304px)');
  triggerTop = 200;
  fireEvent.scroll(window);
  expect(tooltip).toHaveStyle({ top: '142px' });
  triggerTop = 300;
  fireEvent.resize(window);
  expect(tooltip).toHaveStyle({ top: '242px' });
  triggerTop = 400;
  rerender(
    <Tooltip content="Updated information">
      <button type="button">Help</button>
    </Tooltip>,
  );
  expect(tooltip).toHaveStyle({ top: '342px' });
  expect(tooltip).toHaveTextContent('Updated information');
});

test('cleans up its portal, pending timers, resize observer and global listeners on unmount', () => {
  vi.useFakeTimers();
  const observe = vi.fn();
  const disconnect = vi.fn();
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe = observe;
      disconnect = disconnect;
    },
  );
  const removeDocumentListener = vi.spyOn(document, 'removeEventListener');
  const removeWindowListener = vi.spyOn(window, 'removeEventListener');
  const { trigger, unmount } = renderTooltip();
  pointer(trigger, 'pointerover');
  pointer(trigger, 'pointerout');
  expect(observe).toHaveBeenCalledTimes(2);
  unmount();
  expect(screen.queryByRole('tooltip', { hidden: true })).not.toBeInTheDocument();
  expect(vi.getTimerCount()).toBe(0);
  expect(disconnect).toHaveBeenCalledOnce();
  expect(removeDocumentListener).toHaveBeenCalledWith('pointerdown', expect.any(Function), true);
  expect(removeDocumentListener).toHaveBeenCalledWith('focusin', expect.any(Function), true);
  expect(removeDocumentListener).toHaveBeenCalledWith('keydown', expect.any(Function));
  expect(removeWindowListener).toHaveBeenCalledWith('scroll', expect.any(Function), true);
  expect(removeWindowListener).toHaveBeenCalledWith('resize', expect.any(Function));
});
