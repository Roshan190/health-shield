import { useCallback, useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import { useSessionStore } from '@/lib/auth/session-store';
import { maybePromptSideloadUpdate, sideloadUpdateUnsupported } from '@/lib/updates/sideload';

/**
 * Soft sideload update Alert when signed in (Android APK / dev-client).
 * Skips Expo Go. Later dismisses the Alert only — Profile still offers Get update.
 */
export function useSideloadUpdatePrompt() {
  const userId = useSessionStore((s) => s.user?.id ?? null);
  const appState = useRef(AppState.currentState);
  const lastUserId = useRef<string | null>(null);

  const run = useCallback(() => {
    if (!userId || sideloadUpdateUnsupported()) {
      return;
    }
    void maybePromptSideloadUpdate();
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
