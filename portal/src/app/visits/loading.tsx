export default function LoadingVisits() {
  return (
    <>
      <div className="skeleton" style={{ height: 30, width: 180, marginBottom: 10 }} />
      <div className="skeleton" style={{ height: 16, width: '70%', marginBottom: 28 }} />
      {[0, 1, 2].map((i) => (
        <div key={i} className="skeleton-card" aria-hidden="true">
          <div className="skeleton" style={{ height: 18, width: '38%', marginBottom: 12 }} />
          <div className="skeleton" style={{ height: 14, width: '62%' }} />
        </div>
      ))}
      <span className="muted">Loading visit packs…</span>
    </>
  );
}
