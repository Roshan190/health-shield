import Link from 'next/link';
import { notFound } from 'next/navigation';

import { FileIcon, InfoIcon, PolicyIcon, RecordIcon } from '@/components/icons';
import { consentStatus, formatExpiry } from '@/lib/consent-status';
import { createServerSupabase } from '@/lib/supabase/server';

type VisitConsent = {
  id: string;
  doctor_email: string;
  expires_at: string;
  status: string;
};

type VisitItem = {
  resource_type: 'policy' | 'medical_record';
  resource_id: string;
};

type Policy = {
  id: string;
  insurer: string;
  policy_type: string;
  policy_number: string;
  document_path: string | null;
  document_name: string | null;
};

type RecordRow = {
  id: string;
  title: string;
  category: string;
  record_date: string | null;
  document_path: string | null;
  document_name: string | null;
};

type RecordDoc = {
  id: string;
  record_id: string;
  document_path: string;
  document_name: string;
};

async function signedUrl(
  supabase: Awaited<ReturnType<typeof createServerSupabase>>,
  bucket: 'policy-docs' | 'medical-records',
  path: string
) {
  const { data } = await supabase.storage.from(bucket).createSignedUrl(path, 120);
  return data?.signedUrl ?? null;
}

export default async function VisitDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createServerSupabase();

  const { data: consent } = await supabase
    .from('visit_consents')
    .select('id, doctor_email, expires_at, status')
    .eq('id', id)
    .maybeSingle();

  if (!consent) {
    notFound();
  }

  const pack = consent as VisitConsent;
  const status = consentStatus(pack.status, pack.expires_at);

  const { data: itemRows } = await supabase
    .from('visit_consent_items')
    .select('resource_type, resource_id')
    .eq('consent_id', id);

  const items = (itemRows ?? []) as VisitItem[];
  const policyIds = items.filter((i) => i.resource_type === 'policy').map((i) => i.resource_id);
  const recordIds = items
    .filter((i) => i.resource_type === 'medical_record')
    .map((i) => i.resource_id);

  const [policiesRes, recordsRes, docsRes] = await Promise.all([
    policyIds.length
      ? supabase.from('policies').select('id, insurer, policy_type, policy_number, document_path, document_name').in('id', policyIds)
      : Promise.resolve({ data: [] as Policy[] }),
    recordIds.length
      ? supabase.from('medical_records').select('id, title, category, record_date, document_path, document_name').in('id', recordIds)
      : Promise.resolve({ data: [] as RecordRow[] }),
    recordIds.length
      ? supabase
          .from('medical_record_documents')
          .select('id, record_id, document_path, document_name')
          .in('record_id', recordIds)
      : Promise.resolve({ data: [] as RecordDoc[] }),
  ]);

  const policies = (policiesRes.data ?? []) as Policy[];
  const records = (recordsRes.data ?? []) as RecordRow[];
  const docs = (docsRes.data ?? []) as RecordDoc[];

  const policyFiles = await Promise.all(
    policies
      .filter((p) => p.document_path)
      .map(async (p) => ({
        path: p.document_path as string,
        label: p.document_name || 'Policy PDF',
        href: await signedUrl(supabase, 'policy-docs', p.document_path as string),
      }))
  );

  // A record's primary file lives on the row itself; extra files live in
  // medical_record_documents. Merge both and dedupe by storage path.
  const recordPaths = new Map<string, { path: string; label: string }>();
  for (const record of records) {
    if (record.document_path) {
      recordPaths.set(record.document_path, {
        path: record.document_path,
        label: record.document_name || `${record.title} file`,
      });
    }
  }
  for (const doc of docs) {
    if (!recordPaths.has(doc.document_path)) {
      recordPaths.set(doc.document_path, {
        path: doc.document_path,
        label: doc.document_name || 'Record file',
      });
    }
  }
  const recordFiles = await Promise.all(
    [...recordPaths.values()].map(async (entry) => ({
      ...entry,
      href: await signedUrl(supabase, 'medical-records', entry.path),
    }))
  );

  const files = [...policyFiles, ...recordFiles];
  const hasItems = policies.length > 0 || records.length > 0;

  return (
    <>
      <div className="meta-panel">
        <div className="meta-panel-top">
          <h1>Visit pack</h1>
          <span className={`badge ${status.key}`} style={{ background: 'rgba(255,255,255,0.92)' }}>
            {status.label}
          </span>
        </div>
        <div className="meta-grid">
          <div>
            <p className="meta-k">Granted to</p>
            <p className="meta-v">{pack.doctor_email}</p>
          </div>
          <div>
            <p className="meta-k">Access until</p>
            <p className="meta-v">{formatExpiry(pack.expires_at)}</p>
          </div>
        </div>
      </div>

      <p className="notice">
        <InfoIcon />
        <span>
          Assistive organizer for this visit only. Not medical advice — confirm details with the
          patient and the source documents.
        </span>
      </p>

      {!hasItems ? (
        <div className="empty">
          <h2>Nothing in this pack yet</h2>
          <p>The patient granted access but did not attach any policies or records.</p>
        </div>
      ) : null}

      {policies.length > 0 ? (
        <>
          <p className="section-label">
            Policies <span className="count">{policies.length}</span>
          </p>
          <div className="card">
            {policies.map((policy) => (
              <div key={policy.id} className="item">
                <span className="item-icon policy">
                  <PolicyIcon />
                </span>
                <div>
                  <p className="item-title">{policy.insurer}</p>
                  <p className="item-sub">
                    {policy.policy_type} · {policy.policy_number}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : null}

      {records.length > 0 ? (
        <>
          <p className="section-label">
            Medical records <span className="count">{records.length}</span>
          </p>
          <div className="card">
            {records.map((record) => (
              <div key={record.id} className="item">
                <span className="item-icon record">
                  <RecordIcon />
                </span>
                <div>
                  <p className="item-title">{record.title}</p>
                  <p className="item-sub">
                    {record.category}
                    {record.record_date ? ` · ${record.record_date}` : ''}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : null}

      <p className="section-label">
        Files <span className="count">{files.length}</span>
      </p>
      <div className="card">
        {files.length === 0 ? (
          <p className="muted" style={{ margin: 0 }}>
            No files were attached to the items in this pack.
          </p>
        ) : (
          files.map((file) => (
            <div key={file.path} className="file">
              <span className="file-icon">
                <FileIcon />
              </span>
              <span className="file-name">
                {file.label}
                <span className="file-hint">Secure link — valid for 2 minutes after opening</span>
              </span>
              {file.href ? (
                <a
                  className="btn secondary"
                  href={file.href}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`Open ${file.label}`}>
                  Open
                </a>
              ) : (
                <span className="muted">Unavailable</span>
              )}
            </div>
          ))
        )}
      </div>

      <Link className="btn secondary" href="/visits">
        ← Back to packs
      </Link>
    </>
  );
}
