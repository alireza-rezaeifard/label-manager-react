import { FIELDS } from '../data/fields';

export default function ViewDetail({ record, relatedRecords, onEdit, onNavigateToRelated }) {
  return (
    <div className="form-card fade-in">
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div className="stat-icon primary" style={{ width: 50, height: 50, fontSize: '1.5rem' }}>
              <i className="ti ti-tag"></i>
            </div>
            <div>
              <h3 style={{ margin: 0, fontFamily: 'monospace', direction: 'ltr' }}>{record.code}</h3>
              <span style={{ opacity: 0.6 }}>{record.type || '—'} - {record.project}</span>
            </div>
          </div>
          <button className="btn btn-outline" onClick={onEdit}>
            <i className="ti ti-edit"></i> ویرایش
          </button>
        </div>

        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem', marginBottom: '2rem',
        }}>
          {FIELDS.filter(f => f.key !== 'code' && f.key !== 'related').map(f => (
            <div key={f.key} style={{ background: 'var(--bg-body)', padding: '1rem', borderRadius: 8 }}>
              <div style={{ fontSize: '0.75rem', opacity: 0.6, marginBottom: '0.25rem' }}>{f.fa}</div>
              <div style={{ fontWeight: 600, direction: f.key === 'amount' ? 'ltr' : 'rtl' }}>{record[f.key] || '—'}</div>
            </div>
          ))}
        </div>

        {relatedRecords.length > 0 ? (
          <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem' }}>
            <h4 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <i className="ti ti-link" style={{ color: 'var(--primary)' }}></i>
              برچسب‌های مرتبط ({relatedRecords.length})
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {relatedRecords.map(rel => (
                <div
                  key={rel.code}
                  onClick={() => onNavigateToRelated(rel)}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '1rem', background: 'var(--bg-body)', borderRadius: 8,
                    cursor: 'pointer', transition: 'all 0.2s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--hover-bg)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'var(--bg-body)'}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div className="stat-icon info" style={{ width: 36, height: 36 }}>
                      <i className="ti ti-tag"></i>
                    </div>
                    <div>
                      <div style={{ fontFamily: 'monospace', fontWeight: 600 }}>{rel.code}</div>
                      <div style={{ fontSize: '0.8rem', opacity: 0.6 }}>{rel.project}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.75rem', opacity: 0.5 }}>{rel.type}</span>
                    <i className="ti ti-arrow-left" style={{ opacity: 0.5 }}></i>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem', opacity: 0.5, textAlign: 'center' }}>
            <i className="ti ti-link-off" style={{ fontSize: '2rem', marginBottom: '0.5rem' }}></i>
            <p style={{ margin: 0 }}>هیچ برچسب مرتبطی وجود ندارد</p>
          </div>
        )}
      </div>
    </div>
  );
}
