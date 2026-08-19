import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import Link from 'next/link';
import type { ReactNode } from 'react';

import { signOut } from '@/app/visits/actions';
import { ShieldMark } from '@/components/icons';
import { RECOVERY_COOKIE } from '@/lib/auth/recovery-cookie';
import { createServerSupabase } from '@/lib/supabase/server';

import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://portal.health-shield.in'),
  title: 'HealthShield doctor portal',
  description: 'View a time-boxed visit pack the patient granted. Not a HealthShield clinic.',
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const recovering = (await cookies()).get(RECOVERY_COOKIE)?.value === '1';
  const homeHref = recovering ? '/reset-password' : user ? '/visits' : '/login';

  return (
    <html lang="en">
      <body>
        <a className="skip" href="#main">
          Skip to content
        </a>
        <header className="site-header">
          <div className="header-inner">
            <Link className="brand" href={homeHref}>
              <span className="brand-mark">
                <ShieldMark />
              </span>
              <span className="brand-name">
                HealthShield
                <span className="brand-sub">Doctor portal</span>
              </span>
            </Link>
            {user ? (
              <div className="header-user">
                <span className="header-email">{user.email}</span>
                <form action={signOut}>
                  <button className="btn ghost" type="submit">
                    Sign out
                  </button>
                </form>
              </div>
            ) : null}
          </div>
        </header>
        <main id="main" className="shell">
          {children}
        </main>
        <footer className="site-footer">
          <p>
            View-only visit packs granted by patients. Not a HealthShield clinic · not medical
            advice · access ends when the patient revokes it or time runs out.
          </p>
        </footer>
      </body>
    </html>
  );
}
