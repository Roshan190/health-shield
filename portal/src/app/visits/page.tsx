import Link from 'next/link';

import { InboxIcon, InfoIcon } from '@/components/icons';
import { consentStatus, formatExpiry } from '@/lib/consent-status';
import { createServerSupabase } from '@/lib/supabase/server';

type VisitConsent = {
  id: string;
  doctor_email: string;
  expires_at: string;
  status: string;
  created_at: string;
};

export default async function VisitsPage() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from('visit_consents')
    .select('id, doctor_email, expires_at, status, created_at')
    .order('created_at', { ascending: false });

  const consents = (data ?? []) as VisitConsent[];
  const withStatus = consents.map((consent) => ({
    consent,
    info: consentStatus(consent.status, consent.expires_at),
  }));
  const openPacks = withStatus.filter(({ info }) => !info.closed);
  const closedPacks = withStatus.filter(({ info }) => info.closed);

  return (
    <>
      <h1 className="page-title">Visit packs</h1>
      <p className="page-sub">
        Everything a patient chose to share with you for one visit. Packs are view-only and
        disappear when revoked or expired.
      </p>
      {error ? <p className="error">{error.message}</p> : null}

      {consents.length === 0 ? (
        <div className="empty">
          <span className="empty-icon">
            <InboxIcon />
          </span>
          <h2>No live visit packs</h2>
          <p>
            When a patient grants a pack to {user?.email ?? 'this email'}, it appears here
            automatically. Here is how they do it:
          </p>
          <ol className="empty-steps">
            <li>
              <span className="step-num">1</span>
              <span>They open Profile → Doctor visit in the HealthShield app.</span>
            </li>
            <li>
              <span className="step-num">2</span>
              <span>They enter your email and pick the policies or records to share.</span>
            </li>
            <li>
              <span className="step-num">3</span>
              <span>They choose how long you can view it — up to 7 days.</span>
            </li>
          </ol>
        </div>
      ) : (
        <>
          {openPacks.length > 0 ? (
            <div className="list">
              <p className="section-label">
                Open packs <span className="count">{openPacks.length}</span>
              </p>
              {openPacks.map(({ consent, info }) => (
                <Link
                  key={consent.id}
                  className="card"
                  href={`/visits/${consent.id}`}
                  aria-label={`Visit pack granted to ${consent.doctor_email}, ${info.label}`}>
                  <div className="row">
                    <strong>Visit pack</strong>
                    <span className={`badge ${info.key}`}>{info.label}</span>
                  </div>
                  <p className="muted" style={{ margin: '6px 0 0' }}>
                    Granted to {consent.doctor_email} · until {formatExpiry(consent.expires_at)}
                  </p>
                </Link>
              ))}
            </div>
          ) : (
            <p className="notice">
              <InfoIcon />
              <span>No open packs right now — earlier packs below have ended.</span>
            </p>
          )}

          {closedPacks.length > 0 ? (
            <div className="list">
              <p className="section-label">
                Ended <span className="count">{closedPacks.length}</span>
              </p>
              {closedPacks.map(({ consent, info }) => (
                <div key={consent.id} className="card dimmed">
                  <div className="row">
                    <strong>Visit pack</strong>
                    <span className={`badge ${info.key}`}>{info.label}</span>
                  </div>
                  <p className="muted" style={{ margin: '6px 0 0' }}>
                    Granted to {consent.doctor_email} · was valid until{' '}
                    {formatExpiry(consent.expires_at)}
                  </p>
                </div>
              ))}
            </div>
          ) : null}
        </>
      )}
    </>
  );
}
