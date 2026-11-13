import type { ReactElement } from 'react';

import './Toast.scss';

export type ToastProps = {
  /** Plain text notification. */
  message: string;
  /** Called on dismiss. The parent removes the notification. */
  onDismiss: () => void;
};

/** Dismissible notification. ToastProvider handles timing and announcements. */
export default function Toast({ message, onDismiss }: ToastProps): ReactElement {
  return (
    <div className="toa-toast">
      <p className="toa-toast__message">{message}</p>
      <button aria-label="Dismiss notification" className="toa-toast__close" onClick={onDismiss} type="button">
        <span aria-hidden="true">×</span>
      </button>
    </div>
  );
}
