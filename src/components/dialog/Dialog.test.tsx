import { fireEvent, render, screen } from '@testing-library/react';
import { StrictMode } from 'react';
import { afterAll, afterEach, beforeAll, expect, test, vi } from 'vitest';

import { ToaDialog } from './Dialog';

const originalShowModal = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, 'showModal');
const originalClose = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, 'close');

beforeAll(() => {
  // Simulate native opening and initial focus, which jsdom does not implement.
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute('open', '');
    this.querySelector('button')?.focus();
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute('open');
  };
});

afterEach(() => {
  vi.restoreAllMocks();
});

afterAll(() => {
  if (originalShowModal) Object.defineProperty(HTMLDialogElement.prototype, 'showModal', originalShowModal);
  else delete (HTMLDialogElement.prototype as Partial<HTMLDialogElement>).showModal;
  if (originalClose) Object.defineProperty(HTMLDialogElement.prototype, 'close', originalClose);
  else delete (HTMLDialogElement.prototype as Partial<HTMLDialogElement>).close;
});

test('preserves content and native attributes while visibility remains parent-controlled', () => {
  const onDismiss = vi.fn();
  const content = (
    <>
      <h2 id="dialog-title">Choose a date</h2>
      <p id="dialog-description">Available working days only.</p>
    </>
  );
  const { container, rerender } = render(
    <ToaDialog isOpen={false} onDismiss={onDismiss}>
      {content}
    </ToaDialog>,
  );
  const dialog = container.querySelector('dialog')!;
  expect(dialog).not.toHaveAttribute('open');

  rerender(
    <ToaDialog
      isOpen
      onDismiss={onDismiss}
      id="date-dialog"
      className="custom-dialog"
      aria-labelledby="dialog-title"
      aria-describedby="dialog-description"
    >
      {content}
    </ToaDialog>,
  );
  expect(screen.getByRole('dialog', { name: 'Choose a date' })).toBe(dialog);
  expect(dialog).toHaveAccessibleDescription('Available working days only.');
  expect(dialog).toHaveAttribute('id', 'date-dialog');
  expect(dialog).toHaveClass('toa-dialog', 'custom-dialog');

  rerender(
    <ToaDialog isOpen={false} onDismiss={onDismiss}>
      {content}
    </ToaDialog>,
  );
  expect(dialog).not.toHaveAttribute('open');
  expect(onDismiss).not.toHaveBeenCalled();
});

test('Escape requests dismissal without closing until the parent changes visibility', () => {
  const onDismiss = vi.fn();
  render(
    <ToaDialog isOpen onDismiss={onDismiss} aria-label="Calendar">
      Calendar content
    </ToaDialog>,
  );
  const dialog = screen.getByRole('dialog', { name: 'Calendar' });
  const cancelEvent = new Event('cancel', { cancelable: true });

  fireEvent(dialog, cancelEvent);

  expect(cancelEvent.defaultPrevented).toBe(true);
  expect(onDismiss).toHaveBeenCalledOnce();
  expect(dialog).toHaveAttribute('open');
});

test.each([
  [50, 200],
  [350, 200],
  [200, 50],
  [200, 350],
])('requests dismissal for a backdrop click at (%i, %i) but ignores content and padding', (clientX, clientY) => {
  const onDismiss = vi.fn();
  render(
    <ToaDialog isOpen onDismiss={onDismiss} aria-label="Calendar">
      <p>Calendar content</p>
    </ToaDialog>,
  );
  const dialog = screen.getByRole('dialog');
  vi.spyOn(dialog, 'getBoundingClientRect').mockReturnValue({
    left: 100,
    right: 300,
    top: 100,
    bottom: 300,
  } as DOMRect);

  fireEvent.click(screen.getByText('Calendar content'), { clientX, clientY });
  fireEvent.click(dialog, { clientX: 200, clientY: 200 });
  fireEvent.click(dialog, { clientX: 100, clientY: 100 });
  fireEvent.click(dialog, { clientX: 300, clientY: 300 });
  expect(onDismiss).not.toHaveBeenCalled();

  fireEvent.click(dialog, { clientX, clientY });
  expect(onDismiss).toHaveBeenCalledOnce();
  expect(dialog).toHaveAttribute('open');
});

test('restores focus on closing and unmounting and supports reopening in Strict Mode', () => {
  render(<button type="button">Open calendar</button>);
  const trigger = screen.getByRole('button', { name: 'Open calendar' });
  trigger.focus();
  const onDismiss = vi.fn();
  const { container, rerender, unmount } = render(
    <StrictMode>
      <ToaDialog isOpen onDismiss={onDismiss} aria-label="Calendar">
        <button type="button">Calendar action</button>
      </ToaDialog>
    </StrictMode>,
  );
  const dialog = screen.getByRole('dialog');
  const action = screen.getByRole('button', { name: 'Calendar action' });
  expect(action).toHaveFocus();
  expect(dialog).toHaveAttribute('open');

  // Content or callback updates must not close and reopen the native dialog.
  const showModal = vi.spyOn(dialog as HTMLDialogElement, 'showModal');
  rerender(
    <StrictMode>
      <ToaDialog isOpen onDismiss={vi.fn()} aria-label="Calendar">
        <button type="button">Updated calendar action</button>
      </ToaDialog>
    </StrictMode>,
  );
  expect(action).toHaveFocus();
  expect(showModal).not.toHaveBeenCalled();

  rerender(
    <StrictMode>
      <ToaDialog isOpen={false} onDismiss={onDismiss} aria-label="Calendar">
        <button type="button">Calendar action</button>
      </ToaDialog>
    </StrictMode>,
  );
  expect(container.querySelector('dialog')).not.toHaveAttribute('open');
  expect(trigger).toHaveFocus();

  rerender(
    <StrictMode>
      <ToaDialog isOpen onDismiss={onDismiss} aria-label="Calendar">
        <button type="button">Calendar action</button>
      </ToaDialog>
    </StrictMode>,
  );
  expect(action).toHaveFocus();
  unmount();
  expect(dialog).not.toHaveAttribute('open');
  expect(trigger).toHaveFocus();
  expect(onDismiss).not.toHaveBeenCalled();
});

test('does not restore focus to an element removed while the dialog is open', () => {
  const { unmount: removeTrigger } = render(<button type="button">Open calendar</button>);
  const trigger = screen.getByRole('button', { name: 'Open calendar' });
  trigger.focus();
  const { unmount } = render(
    <ToaDialog isOpen onDismiss={vi.fn()} aria-label="Calendar">
      <button type="button">Calendar action</button>
    </ToaDialog>,
  );
  removeTrigger();
  const focus = vi.spyOn(trigger, 'focus');

  expect(() => unmount()).not.toThrow();
  expect(focus).not.toHaveBeenCalled();
});
