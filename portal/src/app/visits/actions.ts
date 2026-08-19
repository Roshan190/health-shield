'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import { RECOVERY_COOKIE, recoveryCookieOptions } from '@/lib/auth/recovery-cookie';
import { createServerSupabase } from '@/lib/supabase/server';

export async function clearPasswordRecoveryCookie() {
  const store = await cookies();
  store.set(RECOVERY_COOKIE, '', { ...recoveryCookieOptions, maxAge: 0 });
}

export async function signOut() {
  const supabase = await createServerSupabase();
  await supabase.auth.signOut();
  await clearPasswordRecoveryCookie();
  redirect('/login');
}
