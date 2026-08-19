import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

import { RECOVERY_COOKIE } from '@/lib/auth/recovery-cookie';

function redirectWithCookies(
  request: NextRequest,
  from: NextResponse,
  pathname: string,
  query?: Record<string, string>
) {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  url.search = '';
  if (query) {
    Object.entries(query).forEach(([key, value]) => url.searchParams.set(key, value));
  }
  const response = NextResponse.redirect(url);
  from.cookies.getAll().forEach((cookie) => {
    response.cookies.set(cookie.name, cookie.value);
  });
  return response;
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    return supabaseResponse;
  }

  const supabase = createServerClient(url, anon, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const recovering = request.cookies.get(RECOVERY_COOKIE)?.value === '1';
  const isLogin = path === '/login';
  const isReset = path === '/reset-password';
  const isProtected = path.startsWith('/visits');

  if (recovering && isProtected) {
    return redirectWithCookies(request, supabaseResponse, '/reset-password');
  }

  if (recovering && isLogin) {
    return redirectWithCookies(request, supabaseResponse, '/reset-password');
  }

  if (!user && isReset) {
    return redirectWithCookies(request, supabaseResponse, '/forgot-password', {
      reason: 'expired',
    });
  }

  if (user && isReset && !recovering) {
    return redirectWithCookies(request, supabaseResponse, '/visits');
  }

  if (!user && isProtected) {
    return redirectWithCookies(request, supabaseResponse, '/login');
  }

  if (user && isLogin && !recovering) {
    return redirectWithCookies(request, supabaseResponse, '/visits');
  }

  return supabaseResponse;
}
