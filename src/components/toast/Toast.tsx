import type { ReactElement } from 'react';

import './Toast.scss';

export type ToaToastProps = {
  /** Plain text notification. */
  message: string;
  /** Called on dismiss. The parent removes the notification. */
  onDismiss: () => void;
};

/** Dismissible notification. ToaToastProvider handles timing and announcements. */
export function ToaToast({ message, onDismiss }: ToaToastProps): ReactElement {
  return (
    <div className="toa-toast">
      <p className="toa-toast__message">{message}</p>
      <button aria-label="Dismiss notification" className="toa-toast__close" onClick={onDismiss} type="button">
        <span aria-hidden="true">×</span>
      </button>
    </div>
  );
}
