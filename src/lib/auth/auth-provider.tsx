import * as Linking from 'expo-linking';
import { PropsWithChildren, useEffect } from 'react';

import {
  completeRecoverySession,
  parseRecoveryUrl,
  persistPasswordRecoveryFlag,
  readPasswordRecoveryFlag,
} from '@/lib/auth/password-recovery';
import { useSessionStore } from '@/lib/auth/session-store';
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase/client';

export function AuthProvider({ children }: PropsWithChildren) {
  const setSession = useSessionStore((s) => s.setSession);
  const setHydrated = useSessionStore((s) => s.setHydrated);
  const setPasswordRecovery = useSessionStore((s) => s.setPasswordRecovery);
  const setRecoveryError = useSessionStore((s) => s.setRecoveryError);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setSession(null);
      setPasswordRecovery(false);
      setHydrated(true);
      return;
    }

    const supabase = getSupabase();
    let cancelled = false;
    const seenUrls = new Set<string>();

    async function ingestUrl(url: string | null) {
      if (!url || seenUrls.has(url) || cancelled) {
        return;
      }
      const parsed = parseRecoveryUrl(url);
      if (!parsed) {
        return;
      }
      seenUrls.add(url);
      setPasswordRecovery(true);
      await persistPasswordRecoveryFlag(true);
      const result = await completeRecoverySession(parsed);
      if (cancelled) {
        return;
      }
      if (result.error) {
        setRecoveryError(result.error);
      }
    }

    void (async () => {
      try {
        const persisted = await readPasswordRecoveryFlag();
        const { data } = await supabase.auth.getSession();
        if (cancelled) {
          return;
        }
        setSession(data.session);
        if (persisted && data.session) {
          setPasswordRecovery(true);
        } else if (persisted && !data.session) {
          setPasswordRecovery(false);
          await persistPasswordRecoveryFlag(false);
        }
        const initial = await Linking.getInitialURL();
        await ingestUrl(initial);
      } finally {
        if (!cancelled) {
          setHydrated(true);
        }
      }
    })();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      if (event === 'PASSWORD_RECOVERY') {
        setPasswordRecovery(true);
        void persistPasswordRecoveryFlag(true);
      }
      if (event === 'SIGNED_OUT') {
        setPasswordRecovery(false);
        setRecoveryError(null);
        void persistPasswordRecoveryFlag(false);
      }
    });

    const linkSub = Linking.addEventListener('url', (event) => {
      void ingestUrl(event.url);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
      linkSub.remove();
    };
  }, [setHydrated, setPasswordRecovery, setRecoveryError, setSession]);

  return children;
}
