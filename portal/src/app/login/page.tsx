'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { createBrowserSupabase } from '@/lib/supabase/client';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState<'signin' | 'signup' | null>(null);

  async function onSubmit(mode: 'signin' | 'signup') {
    setBusy(mode);
    setError(null);
    setInfo(null);
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      setBusy(null);
      return;
    }
    const supabase = createBrowserSupabase();

    if (mode === 'signup') {
      const { data, error: authError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/visits`,
        },
      });
      if (authError) {
        setError(authError.message);
        setBusy(null);
        return;
      }
      if (!data.session) {
        setInfo('Check your inbox to confirm this email, then sign in below.');
        setBusy(null);
        return;
      }
    } else {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (authError) {
        setError(authError.message);
        setBusy(null);
        return;
      }
    }

    router.replace('/visits');
    router.refresh();
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <h1>Doctor sign in</h1>
        <p className="lede">
          Use the email address the patient entered when granting the visit pack.
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void onSubmit('signin');
          }}>
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {error ? <p className="error">{error}</p> : null}
          {info ? <p className="success">{info}</p> : null}
          <p className="auth-links">
            <Link href="/forgot-password">Forgot password?</Link>
          </p>
          <div className="auth-actions">
            <button className="btn" type="submit" disabled={busy !== null}>
              {busy === 'signin' ? 'Signing in…' : 'Sign in'}
            </button>
            <button
              className="btn secondary"
              type="button"
              disabled={busy !== null}
              onClick={() => void onSubmit('signup')}>
              {busy === 'signup' ? 'Creating…' : 'Create account'}
            </button>
          </div>
        </form>
      </div>
      <p className="auth-trust">
        This is not a HealthShield clinic. Patients grant a time-boxed, view-only pack of files —
        you cannot edit their vault, and nothing here is medical advice.
      </p>
    </div>
  );
}
