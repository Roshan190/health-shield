import { createServerClient } from '@supabase/ssr';
import { type EmailOtpType } from '@supabase/supabase-js';
import { NextResponse, type NextRequest } from 'next/server';

import { RECOVERY_COOKIE, recoveryCookieOptions } from '@/lib/auth/recovery-cookie';

function failUrl(request: NextRequest) {
  const url = request.nextUrl.clone();
  url.pathname = '/forgot-password';
  url.search = '';
  url.searchParams.set('reason', 'expired');
  return url;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const token_hash = searchParams.get('token_hash');
  const type = searchParams.get('type') as EmailOtpType | null;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !anon) {
    return NextResponse.redirect(failUrl(request));
  }

  const pendingCookies: { name: string; value: string; options?: object }[] = [];

  const supabase = createServerClient(supabaseUrl, anon, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          pendingCookies.push({ name, value, options });
        });
      },
    },
  });

  let ok = false;
  if (token_hash && type === 'recovery') {
    const { error } = await supabase.auth.verifyOtp({ type: 'recovery', token_hash });
    ok = !error;
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    ok = !error;
  }

  if (!ok) {
    return NextResponse.redirect(failUrl(request));
  }

  const dest = request.nextUrl.clone();
  dest.pathname = '/reset-password';
  dest.search = '';
  const response = NextResponse.redirect(dest);
  pendingCookies.forEach(({ name, value, options }) => {
    response.cookies.set(name, value, options as never);
  });
  response.cookies.set(RECOVERY_COOKIE, '1', recoveryCookieOptions);
  return response;
}
