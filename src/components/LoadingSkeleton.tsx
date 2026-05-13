export function CardSkeleton() {
  return (
    <div className="label-card fade-in" style={{ pointerEvents: 'none' }}>
      <div className="label-card-header">
        <div className="d-flex align-items-center gap-2" style={{ width: '100%' }}>
          <div className="skeleton-box" style={{ width: 24, height: 24, borderRadius: 6 }} />
          <div className="skeleton-box" style={{ width: 120, height: 32, borderRadius: 10 }} />
        </div>
      </div>
      <div className="label-card-body">
        <div className="label-fields-grid">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="label-field-item">
              <div className="skeleton-box" style={{ width: '60%', height: 12, borderRadius: 4, marginBottom: 6 }} />
              <div className="skeleton-box" style={{ width: '80%', height: 16, borderRadius: 4 }} />
            </div>
          ))}
        </div>
      </div>
      <div className="label-card-footer">
        <div className="skeleton-box" style={{ width: '100%', height: 36, borderRadius: 10 }} />
      </div>
    </div>
  );
}

export function StatsSkeleton() {
  return (
    <div className="stats-grid">
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="stat-card">
          <div className="skeleton-box" style={{ width: 56, height: 56, borderRadius: 14, marginBottom: '1.25rem' }} />
          <div className="skeleton-box" style={{ width: '60%', height: 32, borderRadius: 6, marginBottom: '0.5rem' }} />
          <div className="skeleton-box" style={{ width: '40%', height: 16, borderRadius: 4 }} />
        </div>
      ))}
    </div>
  );
}

export function TableSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div className="table-view">
      <div className="table-header">
        {[1, 2, 3, 4, 5, 6].map(i => (
          <div key={i} className="skeleton-box" style={{ height: 16, borderRadius: 4, width: i === 1 ? 80 : 120 }} />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="table-row" style={{ display: 'flex', gap: 16, padding: '1rem 1.25rem', borderBottom: '1px solid var(--border-color)' }}>
          {[1, 2, 3, 4, 5, 6].map(c => (
            <div key={c} className="skeleton-box" style={{ flex: 1, height: 16, borderRadius: 4 }} />
          ))}
        </div>
      ))}
    </div>
  );
}
