'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';

import { GENERIC_RESET_SENT } from '@/lib/auth/recovery-cookie';
import { createBrowserSupabase } from '@/lib/supabase/client';

function ForgotPasswordForm() {
  const searchParams = useSearchParams();
  const expired = searchParams.get('reason') === 'expired';
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(
    expired ? 'This reset link is invalid or has expired. Request a new one.' : null
  );
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const supabase = createBrowserSupabase();
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/auth/confirm`,
    });
    if (resetError) {
      const lower = resetError.message.toLowerCase();
      if (lower.includes('rate') || lower.includes('too many')) {
        setError('Too many attempts. Try again in a few minutes.');
        setBusy(false);
        return;
      }
      if (lower.includes('redirect')) {
        setError('Password reset is not fully configured yet.');
        setBusy(false);
        return;
      }
    }
    setSent(true);
    setBusy(false);
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <h1>Reset your password</h1>
        <p className="lede">We’ll email a link if this address has a HealthShield account.</p>
        {sent ? (
          <p className="success">{GENERIC_RESET_SENT}</p>
        ) : (
          <form onSubmit={(e) => void onSubmit(e)}>
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            {error ? <p className="error">{error}</p> : null}
            <div className="auth-actions">
              <button className="btn" type="submit" disabled={busy}>
                {busy ? 'Sending…' : 'Send reset link'}
              </button>
            </div>
          </form>
        )}
        <p className="auth-links">
          <Link href="/login">Back to sign in</Link>
        </p>
      </div>
      <p className="auth-trust">
        Open the link in this browser. Resetting the password also changes sign-in for the
        HealthShield app.
      </p>
    </div>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="auth-wrap">
          <div className="auth-card">
            <h1>Reset your password</h1>
            <p className="lede">Loading…</p>
          </div>
        </div>
      }>
      <ForgotPasswordForm />
    </Suspense>
  );
}
