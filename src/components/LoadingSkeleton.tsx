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

function SkeletonBlock({ width = '100%', height = 16, mb = '0.75rem' }) {
  return <div className="skeleton-box" style={{ width, height, borderRadius: 6, marginBottom: mb }} />;
}

export function FormSkeleton() {
  return (
    <div className="form-card fade-in" style={{ pointerEvents: 'none' }}>
      <div className="row">
        {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
          <div key={i} className="col-md-6">
            <div className="form-group">
              <SkeletonBlock width="40%" height={14} mb="0.5rem" />
              <SkeletonBlock width="100%" height={42} mb="0" />
            </div>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
        <SkeletonBlock width={140} height={42} />
        <SkeletonBlock width={100} height={42} />
      </div>
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="fade-in" style={{ pointerEvents: 'none' }}>
      <StatsSkeleton />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
        {[1, 2].map(i => (
          <div key={i} className="form-card" style={{ padding: '1.5rem' }}>
            <SkeletonBlock width="50%" height={18} mb="1rem" />
            <SkeletonBlock width="100%" height={280} mb="0" />
          </div>
        ))}
      </div>
      <div className="form-card" style={{ padding: '1.5rem' }}>
        <SkeletonBlock width="30%" height={18} mb="1rem" />
        <SkeletonBlock width="100%" height={160} mb="0" />
      </div>
    </div>
  );
}

export function ReportsSkeleton() {
  return (
    <div className="fade-in" style={{ pointerEvents: 'none' }}>
      <div className="d-flex gap-2 mb-4">
        {[1, 2, 3, 4].map(i => <SkeletonBlock key={i} width={120} height={38} />)}
      </div>
      <div className="form-card" style={{ padding: '1.5rem' }}>
        <SkeletonBlock width="40%" height={18} mb="1.5rem" />
        <SkeletonBlock width="100%" height={200} mb="0" />
      </div>
    </div>
  );
}

export function SettingsSkeleton() {
  return (
    <div className="fade-in" style={{ pointerEvents: 'none' }}>
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="form-card mb-4">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
            <SkeletonBlock width={56} height={56} mb="0" />
            <div style={{ flex: 1 }}>
              <SkeletonBlock width="30%" height={18} mb="0.25rem" />
              <SkeletonBlock width="50%" height={14} mb="0" />
            </div>
          </div>
          <SkeletonBlock width="100%" height={42} mb="0" />
        </div>
      ))}
    </div>
  );
}

export function ProfileSkeleton() {
  return (
    <div className="fade-in" style={{ pointerEvents: 'none' }}>
      <div className="form-card mb-4" style={{ textAlign: 'center', padding: '3rem' }}>
        <SkeletonBlock width={80} height={80} mb="1rem" style={{ borderRadius: '50%', margin: '0 auto 1rem' }} />
        <SkeletonBlock width="30%" height={22} mb="0.5rem" style={{ margin: '0 auto' }} />
        <SkeletonBlock width="20%" height={14} mb="0" style={{ margin: '0 auto' }} />
      </div>
      <div className="form-card">
        {[1, 2].map(i => (
          <div key={i} style={{ marginBottom: i < 2 ? '1.5rem' : 0 }}>
            <SkeletonBlock width="25%" height={14} mb="0.5rem" />
            <SkeletonBlock width="100%" height={42} mb="0" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function HistorySkeleton() {
  return (
    <div className="fade-in" style={{ pointerEvents: 'none' }}>
      {[1, 2, 3, 4, 5].map(i => (
        <div key={i} className="history-item mb-3">
          <div style={{ flex: 1 }}>
            <SkeletonBlock width="60%" height={16} mb="0.25rem" />
            <SkeletonBlock width="30%" height={12} mb="0" />
          </div>
          <SkeletonBlock width={70} height={32} mb="0" />
        </div>
      ))}
    </div>
  );
}

export function ViewDetailSkeleton() {
  return (
    <div className="fade-in" style={{ pointerEvents: 'none' }}>
      <div className="form-card">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <SkeletonBlock width="30%" height={24} mb="0" />
          <SkeletonBlock width={80} height={36} mb="0" />
        </div>
        <div className="row">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="col-md-6 mb-3">
              <SkeletonBlock width="35%" height={12} mb="0.35rem" />
              <SkeletonBlock width="70%" height={18} mb="0" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function ImportSkeleton() {
  return (
    <div className="fade-in" style={{ pointerEvents: 'none' }}>
      <div className="upload-zone" style={{ marginBottom: '1.5rem' }}>
        <SkeletonBlock width={80} height={80} mb="1rem" style={{ borderRadius: 20, margin: '0 auto 1rem' }} />
        <SkeletonBlock width="50%" height={18} mb="0.5rem" style={{ margin: '0 auto' }} />
        <SkeletonBlock width="30%" height={14} mb="0" style={{ margin: '0 auto' }} />
      </div>
      <div className="form-card">
        <SkeletonBlock width="100%" height={200} mb="0" />
      </div>
    </div>
  );
}

export function PreviewSkeleton() {
  return (
    <div className="fade-in" style={{ pointerEvents: 'none' }}>
      <div className="d-flex align-items-center gap-2 mb-4 p-3" style={{ background: 'var(--card-bg)', borderRadius: 12, border: '1px solid var(--border-color)' }}>
        <SkeletonBlock width={24} height={24} mb="0" />
        <SkeletonBlock width="40%" height={16} mb="0" />
      </div>
      <div className="preview-grid">
        {[1, 2, 3, 4, 5, 6].map(i => (
          <div key={i} className="preview-label" style={{ height: 200 }}>
            <SkeletonBlock width="80%" height={14} mb="0.75rem" style={{ margin: '0 auto' }} />
            <SkeletonBlock width="100%" height={12} mb="0.5rem" />
            <SkeletonBlock width="100%" height={12} mb="0.5rem" />
            <SkeletonBlock width="70%" height={12} mb="0" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function BarcodeSkeleton() {
  return (
    <div className="fade-in" style={{ pointerEvents: 'none', padding: '2rem', textAlign: 'center' }}>
      <SkeletonBlock width={280} height={180} mb="0" style={{ margin: '0 auto', borderRadius: 12 }} />
    </div>
  );
}
