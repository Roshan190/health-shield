import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="empty">
      <h2>Visit pack not available</h2>
      <p>
        It may have expired, been revoked by the patient, or been granted to a different email
        address.
      </p>
      <p style={{ marginTop: 20 }}>
        <Link className="btn secondary" href="/visits">
          ← Back to packs
        </Link>
      </p>
    </div>
  );
}
