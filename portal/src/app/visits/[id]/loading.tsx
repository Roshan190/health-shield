export default function LoadingVisitDetail() {
  return (
    <>
      <div className="skeleton" style={{ height: 120, borderRadius: 18, marginBottom: 20 }} />
      {[0, 1].map((i) => (
        <div key={i} className="skeleton-card" aria-hidden="true">
          <div className="skeleton" style={{ height: 18, width: '42%', marginBottom: 12 }} />
          <div className="skeleton" style={{ height: 14, width: '68%' }} />
        </div>
      ))}
      <span className="muted">Opening visit pack…</span>
    </>
  );
}
