import { useEffect, useRef, type ReactElement, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

import Toast from '../toast/Toast';

import { ToastContext } from './useToast';
import { useToastQueue } from './useToastQueue';

import './ToastProvider.scss';

export type ToastProviderProps = {
  /** Application content that can call useToast. Mount one provider around the router. */
  children: ReactNode;
};

export default function ToastProvider({ children }: ToastProviderProps): ReactElement {
  const { notifications, actions, setPaused } = useToastQueue();
  const stackRef = useRef<HTMLDivElement>(null);
  const newestId = notifications.at(-1)?.id;

  useEffect(() => {
    const stack = stackRef.current;
    if (stack) stack.scrollTop = stack.scrollHeight;
  }, [newestId]);

  return (
    <ToastContext.Provider value={actions}>
      {children}
      {createPortal(
        <>
          <div
            aria-atomic="false"
            aria-label="Notifications"
            aria-live="polite"
            aria-relevant="additions"
            className="toa-toast-announcements"
            role="log"
          >
            {notifications.map(({ id, message }) => (
              <p key={id}>{message}</p>
            ))}
          </div>
          <div className="toa-toast-stack" ref={stackRef}>
            {notifications.map(({ id, message }) => (
              <div
                className="toa-toast-stack__item"
                key={id}
                onBlur={(event) => {
                  if (!event.currentTarget.contains(event.relatedTarget)) setPaused(id, 'focus', false);
                }}
                onFocus={() => setPaused(id, 'focus', true)}
                onMouseEnter={() => setPaused(id, 'hover', true)}
                onMouseLeave={() => setPaused(id, 'hover', false)}
              >
                <Toast message={message} onDismiss={() => actions.dismissToast(id)} />
              </div>
            ))}
          </div>
        </>,
        document.body,
      )}
    </ToastContext.Provider>
  );
}
