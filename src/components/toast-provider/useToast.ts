import { createContext, useContext } from 'react';

export type ToastActions = {
  /** Appends a notification with its own five-second timer and returns its ID. */
  showToast: (message: string) => string;
  /** Dismisses the notification with this ID; unknown IDs are ignored. */
  dismissToast: (id: string) => void;
};

export const ToastContext = createContext<ToastActions | undefined>(undefined);

/** Access the app's notifications. Must be called within ToastProvider. */
export function useToast(): ToastActions {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within a ToastProvider.');
  return context;
}
