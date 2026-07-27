import { useCallback, useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import { useSessionStore } from '@/lib/auth/session-store';
import { resyncAllLocalReminders } from '@/lib/notifications/resync';

/**
 * Reschedule renewal + medication reminders when the user is signed in and
 * the app returns to the foreground (and once on mount / login).
 */
export function useReminderResyncOnForeground() {
  const userId = useSessionStore((s) => s.user?.id ?? null);
  const appState = useRef(AppState.currentState);
  const lastUserId = useRef<string | null>(null);

  const run = useCallback(() => {
    if (!userId) {
      return;
    }
    void resyncAllLocalReminders();
  }, [userId]);

  useEffect(() => {
    if (!userId) {
      lastUserId.current = null;
      return;
    }
    if (lastUserId.current !== userId) {
      lastUserId.current = userId;
      run();
    }
  }, [userId, run]);

  useEffect(() => {
    const onChange = (next: AppStateStatus) => {
      const wasBackground =
        appState.current === 'background' || appState.current === 'inactive';
      appState.current = next;
      if (wasBackground && next === 'active' && userId) {
        run();
      }
    };
    const sub = AppState.addEventListener('change', onChange);
    return () => sub.remove();
  }, [userId, run]);
}
