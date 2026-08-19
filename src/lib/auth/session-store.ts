import type { Session, User } from '@supabase/supabase-js';
import { create } from 'zustand';

type SessionState = {
  isHydrated: boolean;
  session: Session | null;
  user: User | null;
  passwordRecovery: boolean;
  recoveryError: string | null;
  setSession: (session: Session | null) => void;
  setHydrated: (value: boolean) => void;
  setPasswordRecovery: (value: boolean) => void;
  setRecoveryError: (value: string | null) => void;
};

export const useSessionStore = create<SessionState>((set) => ({
  isHydrated: false,
  session: null,
  user: null,
  passwordRecovery: false,
  recoveryError: null,
  setSession: (session) =>
    set({
      session,
      user: session?.user ?? null,
    }),
  setHydrated: (isHydrated) => set({ isHydrated }),
  setPasswordRecovery: (passwordRecovery) =>
    set(passwordRecovery ? { passwordRecovery } : { passwordRecovery, recoveryError: null }),
  setRecoveryError: (recoveryError) => set({ recoveryError }),
}));

export function useIsAuthenticated() {
  return useSessionStore((s) => Boolean(s.session));
}

export function usePasswordRecovery() {
  return useSessionStore((s) => s.passwordRecovery);
}
