import { useEffect, useRef, type ReactElement, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

import { ToaToast } from './Toast';
import { ToastContext } from './useToast';
import { useToastQueue } from './useToastQueue';

import './ToastProvider.scss';

export type ToaToastProviderProps = {
  /** Content with access to `useToast`. */
  children: ReactNode;
};

/**
 * Mount once above `useToast` callers. Notifications render in `document.body`
 * with polite announcements and expire after five seconds, paused on hover or focus.
 * Use inline feedback inside modal dialogs.
 */
export function ToaToastProvider({ children }: ToaToastProviderProps): ReactElement {
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
                <ToaToast message={message} onDismiss={() => actions.dismissToast(id)} />
              </div>
            ))}
          </div>
        </>,
        document.body,
      )}
    </ToastContext.Provider>
  );
}
