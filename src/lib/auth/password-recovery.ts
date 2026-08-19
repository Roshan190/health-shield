import AsyncStorage from '@react-native-async-storage/async-storage';
import type { EmailOtpType } from '@supabase/supabase-js';

import { getSupabase } from '@/lib/supabase/client';

/** Static marketing bounce (no keys). Must be on the Auth redirect allow-list. */
export const APP_PASSWORD_RESET_REDIRECT = 'https://health-shield.in/app-reset';

export const GENERIC_RESET_SENT =
  'If an account exists for this email, we sent a reset link. It expires in about an hour — check spam. This email is used for the HealthShield app and the doctor portal; resetting it changes the password on both.';

const STORAGE_KEY = 'healthshield.passwordRecovery';

export type RecoveryLinkParams = {
  code?: string;
  token_hash?: string;
  type?: string;
  access_token?: string;
  refresh_token?: string;
  error?: string;
};

export async function readPasswordRecoveryFlag(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(STORAGE_KEY)) === '1';
  } catch {
    return false;
  }
}

export async function persistPasswordRecoveryFlag(value: boolean): Promise<void> {
  try {
    if (value) {
      await AsyncStorage.setItem(STORAGE_KEY, '1');
    } else {
      await AsyncStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // Local flag only; recovery still works for this process.
  }
}

export function parseRecoveryUrl(url: string): RecoveryLinkParams | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }

  const hash = parsed.hash.startsWith('#') ? parsed.hash.slice(1) : parsed.hash;
  const hashParams = new URLSearchParams(hash);
  const query = parsed.searchParams;

  const code = query.get('code') ?? undefined;
  const token_hash = query.get('token_hash') ?? hashParams.get('token_hash') ?? undefined;
  const type = query.get('type') ?? hashParams.get('type') ?? undefined;
  const access_token = hashParams.get('access_token') ?? query.get('access_token') ?? undefined;
  const refresh_token = hashParams.get('refresh_token') ?? query.get('refresh_token') ?? undefined;
  const error = query.get('error') ?? hashParams.get('error') ?? undefined;

  const looksLikeRecovery = Boolean(
    error || code || token_hash || type === 'recovery' || (access_token && refresh_token)
  );
  if (!looksLikeRecovery) {
    return null;
  }

  return { code, token_hash, type, access_token, refresh_token, error };
}

export function describeRecoveryFailure(raw: string): string {
  const message = raw.toLowerCase();
  if (
    message.includes('verifier') ||
    message.includes('code challenge') ||
    message.includes('pkce')
  ) {
    return 'Open this link on the same phone where you requested the reset.';
  }
  if (message.includes('expired') || message.includes('otp_expired')) {
    return 'This reset link has expired. Request a new one.';
  }
  if (message.includes('redirect')) {
    return 'Password reset is not fully configured yet.';
  }
  return 'This reset link is invalid or already used.';
}

export async function completeRecoverySession(
  parsed: RecoveryLinkParams
): Promise<{ error: string | null }> {
  if (parsed.error) {
    return { error: describeRecoveryFailure(parsed.error) };
  }

  const supabase = getSupabase();

  try {
    if (parsed.code) {
      const { error } = await supabase.auth.exchangeCodeForSession(parsed.code);
      if (error) {
        return { error: describeRecoveryFailure(error.message) };
      }
      return { error: null };
    }

    if (parsed.token_hash) {
      const type: EmailOtpType =
        parsed.type === 'recovery' || !parsed.type ? 'recovery' : (parsed.type as EmailOtpType);
      if (type !== 'recovery') {
        return { error: 'This reset link is invalid or already used.' };
      }
      const { error } = await supabase.auth.verifyOtp({
        type: 'recovery',
        token_hash: parsed.token_hash,
      });
      if (error) {
        return { error: describeRecoveryFailure(error.message) };
      }
      return { error: null };
    }

    if (parsed.access_token && parsed.refresh_token) {
      const { error } = await supabase.auth.setSession({
        access_token: parsed.access_token,
        refresh_token: parsed.refresh_token,
      });
      if (error) {
        return { error: describeRecoveryFailure(error.message) };
      }
      return { error: null };
    }

    return { error: 'This reset link is invalid or already used.' };
  } catch (e) {
    return { error: describeRecoveryFailure(e instanceof Error ? e.message : 'unknown') };
  }
}

export async function revokeOtherSessions(): Promise<string | null> {
  const { error } = await getSupabase().auth.signOut({ scope: 'others' });
  return error?.message ?? null;
}

export function isAuthRateLimit(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes('rate limit') ||
    lower.includes('too many') ||
    lower.includes('over_email_send_rate_limit')
  );
}

export function isRedirectAllowListError(message: string): boolean {
  return message.toLowerCase().includes('redirect');
}
