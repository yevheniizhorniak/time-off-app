import { createContext, useContext } from 'react';

export type ToastActions = {
  /** Queues a notification and returns its dismissal ID. */
  showToast: (message: string) => string;
  /** Unknown IDs are ignored. */
  dismissToast: (id: string) => void;
};

export const ToastContext = createContext<ToastActions | undefined>(undefined);

/** Throws outside ToastProvider. */
export function useToast(): ToastActions {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within a ToastProvider.');
  return context;
}
