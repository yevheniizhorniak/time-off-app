import { fireEvent, render, screen } from '@testing-library/react';
import { afterAll, beforeAll, expect, test, vi } from 'vitest';

import { ToaConfirmationDialog } from './ConfirmationDialog';

const originalShowModal = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, 'showModal');
const originalClose = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, 'close');

beforeAll(() => {
  // jsdom does not implement the native dialog methods.
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute('open');
  };
});

afterAll(() => {
  if (originalShowModal) {
    Object.defineProperty(HTMLDialogElement.prototype, 'showModal', originalShowModal);
  } else {
    delete (HTMLDialogElement.prototype as Partial<HTMLDialogElement>).showModal;
  }
  if (originalClose) {
    Object.defineProperty(HTMLDialogElement.prototype, 'close', originalClose);
  } else {
    delete (HTMLDialogElement.prototype as Partial<HTMLDialogElement>).close;
  }
});

const title = 'Approve request?';
const message = 'This will update the request status.';

test('opens as an accessible dialog and closes when isOpen becomes false', () => {
  const onCancel = vi.fn();
  const onConfirm = vi.fn();
  const { container, rerender } = render(
    <ToaConfirmationDialog isOpen title={title} message={message} onCancel={onCancel} onConfirm={onConfirm} />,
  );

  const dialog = screen.getByRole('dialog', { name: title });
  expect(dialog).toHaveAccessibleDescription(message);
  expect(dialog).toHaveAttribute('open');
  expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Confirm' })).toBeInTheDocument();

  rerender(
    <ToaConfirmationDialog isOpen={false} title={title} message={message} onCancel={onCancel} onConfirm={onConfirm} />,
  );

  expect(container.querySelector('dialog')).not.toHaveAttribute('open');
  expect(onCancel).not.toHaveBeenCalled();
  expect(onConfirm).not.toHaveBeenCalled();
});

test('uses custom labels and invokes the matching button callback', () => {
  const onCancel = vi.fn();
  const onConfirm = vi.fn();
  render(
    <ToaConfirmationDialog
      cancelLabel="Keep pending"
      confirmLabel="Approve"
      isOpen
      message={message}
      onCancel={onCancel}
      onConfirm={onConfirm}
      title={title}
    />,
  );

  const cancelButton = screen.getByRole('button', { name: 'Keep pending' });
  expect(cancelButton).toHaveClass('toa-button', 'toa-button--secondary');
  expect(cancelButton).toHaveAttribute('type', 'button');
  fireEvent.click(cancelButton);
  expect(onCancel).toHaveBeenCalledOnce();
  expect(onConfirm).not.toHaveBeenCalled();

  const confirmButton = screen.getByRole('button', { name: 'Approve' });
  expect(confirmButton).toHaveClass('toa-button', 'toa-button--primary');
  expect(confirmButton).toHaveAttribute('type', 'button');
  fireEvent.click(confirmButton);
  expect(onConfirm).toHaveBeenCalledOnce();
  expect(onCancel).toHaveBeenCalledOnce();
});

test('treats Escape as cancellation without letting the browser close controlled state', () => {
  const onCancel = vi.fn();
  const { container } = render(
    <ToaConfirmationDialog isOpen title={title} message={message} onCancel={onCancel} onConfirm={vi.fn()} />,
  );
  const dialog = container.querySelector('dialog')!;

  const cancelEvent = new Event('cancel', { cancelable: true });
  fireEvent(dialog, cancelEvent);

  expect(cancelEvent.defaultPrevented).toBe(true);
  expect(onCancel).toHaveBeenCalledOnce();
  expect(dialog).toHaveAttribute('open');
});

test('treats backdrop clicks as cancellation but ignores clicks inside the dialog', () => {
  const onCancel = vi.fn();
  const { container } = render(
    <ToaConfirmationDialog isOpen title={title} message={message} onCancel={onCancel} onConfirm={vi.fn()} />,
  );
  const dialog = container.querySelector('dialog')!;
  vi.spyOn(dialog, 'getBoundingClientRect').mockReturnValue({
    left: 100,
    top: 100,
    right: 300,
    bottom: 300,
  } as DOMRect);

  fireEvent.click(dialog, { clientX: 150, clientY: 150 });
  fireEvent.click(screen.getByText(message));
  expect(onCancel).not.toHaveBeenCalled();

  fireEvent.click(dialog, { clientX: 50, clientY: 150 });
  expect(onCancel).toHaveBeenCalledOnce();
});
