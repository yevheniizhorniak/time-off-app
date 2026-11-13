import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';

import type { ToastActions } from './useToast';

type Notification = { id: string; message: string };
type PauseReason = 'hover' | 'focus';
type Timer = {
  timeout?: ReturnType<typeof setTimeout>;
  remaining: number;
  startedAt: number;
  pausedBy: Set<PauseReason>;
};

const duration = 5000;

/** Provider state and per-notification clocks, separate from rendering. */
export function useToastQueue(): {
  notifications: Notification[];
  actions: ToastActions;
  setPaused: (id: string, reason: PauseReason, paused: boolean) => void;
} {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const prefix = useId();
  const nextId = useRef(0);
  const timers = useRef(new Map<string, Timer>());

  const dismissToast = useCallback((id: string): void => {
    const timer = timers.current.get(id);
    if (timer) clearTimeout(timer.timeout);
    timers.current.delete(id);
    setNotifications((current) => current.filter((notification) => notification.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string): string => {
      const id = `${prefix}-${nextId.current++}`;
      setNotifications((current) => [...current, { id, message }]);
      return id;
    },
    [prefix],
  );

  useEffect(() => {
    for (const { id } of notifications) {
      if (timers.current.has(id)) continue;
      const timer: Timer = { remaining: duration, startedAt: performance.now(), pausedBy: new Set() };
      timer.timeout = setTimeout(() => dismissToast(id), timer.remaining);
      timers.current.set(id, timer);
    }
  }, [notifications, dismissToast]);

  useEffect(() => {
    const activeTimers = timers.current;
    return () => {
      for (const timer of activeTimers.values()) clearTimeout(timer.timeout);
      activeTimers.clear();
    };
  }, []);

  const setPaused = useCallback(
    (id: string, reason: PauseReason, paused: boolean): void => {
      const timer = timers.current.get(id);
      if (!timer) return;

      if (paused) {
        if (timer.pausedBy.size === 0) {
          clearTimeout(timer.timeout);
          timer.remaining = Math.max(0, timer.remaining - (performance.now() - timer.startedAt));
        }
        timer.pausedBy.add(reason);
      } else if (timer.pausedBy.delete(reason) && timer.pausedBy.size === 0) {
        timer.startedAt = performance.now();
        timer.timeout = setTimeout(() => dismissToast(id), timer.remaining);
      }
    },
    [dismissToast],
  );

  const actions = useMemo(() => ({ showToast, dismissToast }), [showToast, dismissToast]);
  return { notifications, actions, setPaused };
}
