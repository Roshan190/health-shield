import { PropsWithChildren, useEffect } from 'react';

import { useSessionStore } from '@/lib/auth/session-store';
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase/client';

export function AuthProvider({ children }: PropsWithChildren) {
  const setSession = useSessionStore((s) => s.setSession);
  const setHydrated = useSessionStore((s) => s.setHydrated);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setSession(null);
      setHydrated(true);
      return;
    }

    const supabase = getSupabase();

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setHydrated(true);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [setHydrated, setSession]);

  return children;
}
