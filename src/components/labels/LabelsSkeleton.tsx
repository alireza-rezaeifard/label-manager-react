export function LabelsSkeleton() {
  return (
    <div className="lbx-skeleton" aria-hidden="true" style={{ pointerEvents: 'none' }}>
      <div className="skeleton-box" style={{ width: 260, height: 44, borderRadius: 10, marginBottom: '0.75rem' }} />
      <div className="skeleton-box" style={{ width: '100%', height: 64, borderRadius: 14, marginBottom: '0.75rem' }} />
      <div className="skeleton-box" style={{ width: '100%', height: 96, borderRadius: 14, marginBottom: '1rem' }} />
      <div className="lbx-grid">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="lbx-stub">
            <div className="lbx-stub-head">
              <div className="skeleton-box" style={{ width: 16, height: 16, borderRadius: 4 }} />
              <div className="skeleton-box" style={{ width: 120, height: 26, borderRadius: 7 }} />
            </div>
            <div className="lbx-stub-body">
              <div className="skeleton-box" style={{ width: '45%', height: 11, borderRadius: 4, marginBottom: 8 }} />
              <div className="skeleton-box" style={{ width: '60%', height: 22, borderRadius: 6, marginBottom: 8 }} />
              <div className="skeleton-box" style={{ width: '75%', height: 14, borderRadius: 4, marginBottom: 8 }} />
              <div className="skeleton-box" style={{ width: '35%', height: 12, borderRadius: 4 }} />
            </div>
            <div className="lbx-stub-foot">
              <div className="skeleton-box" style={{ flex: 1, height: 30, borderRadius: 8 }} />
              <div className="skeleton-box" style={{ flex: 1, height: 30, borderRadius: 8 }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
