import type { Session, User } from '@supabase/supabase-js';
import { create } from 'zustand';

type SessionState = {
  isHydrated: boolean;
  session: Session | null;
  user: User | null;
  setSession: (session: Session | null) => void;
  setHydrated: (value: boolean) => void;
};

export const useSessionStore = create<SessionState>((set) => ({
  isHydrated: false,
  session: null,
  user: null,
  setSession: (session) =>
    set({
      session,
      user: session?.user ?? null,
    }),
  setHydrated: (isHydrated) => set({ isHydrated }),
}));

export function useIsAuthenticated() {
  return useSessionStore((s) => Boolean(s.session));
}
