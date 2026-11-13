import { useId, type ReactElement } from 'react';

import { ToaButton } from '../button/Button';
import { ToaDialog } from '../dialog/Dialog';

import './ConfirmationDialog.scss';

export type ToaConfirmationDialogProps = {
  /** Parent-controlled visibility. Set to `false` after either action to close. */
  isOpen: boolean;
  /** Visible heading and accessible name. */
  title: string;
  /** Body text and accessible description. */
  message: string;
  /** Called on confirmation. */
  onConfirm: () => void;
  /** Called on cancellation, Escape, or a backdrop click. */
  onCancel: () => void;
  /** Confirm button text. Defaults to `Confirm`. */
  confirmLabel?: string;
  /** Cancel button text. Defaults to `Cancel`. */
  cancelLabel?: string;
};

/** Controlled native modal dialog. */
export function ToaConfirmationDialog({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
}: ToaConfirmationDialogProps): ReactElement {
  const titleId = useId();
  const messageId = useId();

  return (
    <ToaDialog
      aria-describedby={messageId}
      aria-labelledby={titleId}
      className="toa-confirmation-dialog"
      isOpen={isOpen}
      onDismiss={onCancel}
    >
      <h2 className="toa-confirmation-dialog__title" id={titleId}>
        {title}
      </h2>
      <p className="toa-confirmation-dialog__message" id={messageId}>
        {message}
      </p>
      <div className="toa-confirmation-dialog__actions">
        <ToaButton emphasis="secondary" label={cancelLabel} onClick={onCancel} />
        <ToaButton emphasis="primary" label={confirmLabel} onClick={onConfirm} />
      </div>
    </ToaDialog>
  );
}
