import { useEffect, useId, useRef, type MouseEvent, type ReactElement, type SyntheticEvent } from 'react';

import './ConfirmationDialog.scss';

export type ConfirmationDialogProps = {
  /** Whether the dialog is open; the parent updates this after an action. */
  isOpen: boolean;
  /** Dialog heading and accessible name. */
  title: string;
  /** Explanation of the action being confirmed. */
  message: string;
  /** Called when the user confirms the action. */
  onConfirm: () => void;
  /** Called when the user cancels, presses Escape, or clicks the backdrop. */
  onCancel: () => void;
  /** Confirm button text. Defaults to `Confirm`. */
  confirmLabel?: string;
  /** Cancel button text. Defaults to `Cancel`. */
  cancelLabel?: string;
};

export default function ConfirmationDialog({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
}: ConfirmationDialogProps): ReactElement {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const messageId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen && !dialog.open) {
      dialog.showModal();
    } else if (!isOpen && dialog.open) {
      dialog.close();
    }
  }, [isOpen]);

  function handleCancel(event: SyntheticEvent<HTMLDialogElement>): void {
    event.preventDefault();
    onCancel();
  }

  function handleBackdropClick(event: MouseEvent<HTMLDialogElement>): void {
    if (event.target !== event.currentTarget) return;

    const bounds = event.currentTarget.getBoundingClientRect();
    if (
      event.clientX < bounds.left ||
      event.clientX > bounds.right ||
      event.clientY < bounds.top ||
      event.clientY > bounds.bottom
    ) {
      onCancel();
    }
  }

  return (
    <dialog
      aria-describedby={messageId}
      aria-labelledby={titleId}
      className="toa-confirmation-dialog"
      onCancel={handleCancel}
      onClick={handleBackdropClick}
      ref={dialogRef}
    >
      <h2 className="toa-confirmation-dialog__title" id={titleId}>
        {title}
      </h2>
      <p className="toa-confirmation-dialog__message" id={messageId}>
        {message}
      </p>
      <div className="toa-confirmation-dialog__actions">
        <button
          className="toa-confirmation-dialog__button toa-confirmation-dialog__button--cancel"
          onClick={onCancel}
          type="button"
        >
          {cancelLabel}
        </button>
        <button
          className="toa-confirmation-dialog__button toa-confirmation-dialog__button--confirm"
          onClick={onConfirm}
          type="button"
        >
          {confirmLabel}
        </button>
      </div>
    </dialog>
  );
}
