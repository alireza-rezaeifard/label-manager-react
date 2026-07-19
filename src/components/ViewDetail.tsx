import { FIELDS } from '../data/fields';
import { formatAmount } from '../utils/formatters';
import type { RecordItem, CustomField } from '../types';

export default function ViewDetail({ record, relatedRecords, onEdit, onNavigateToRelated, customFields = [], onShowHistory, onLock, onUnlock }: {
  record: RecordItem;
  relatedRecords: RecordItem[];
  onEdit: () => void;
  onNavigateToRelated: (rel: RecordItem) => void;
  customFields?: CustomField[];
  onShowHistory?: () => void;
  onLock?: () => void;
  onUnlock?: () => void;
}) {
  return (
    <div className="form-card fade-in">
      <div>
        {record.image && (
          <div style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
            <img src={record.image} alt={record.code}
              style={{ maxWidth: '100%', maxHeight: 300, borderRadius: 12, border: '1px solid var(--border-color)', objectFit: 'contain' }} />
          </div>
        )}
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
          <div className="d-flex gap-2">
            {onShowHistory && (
              <button className="btn btn-outline" onClick={onShowHistory}>
                <i className="ti ti-history"></i> تاریخچه
              </button>
            )}
            {record.locked_by ? (
              onUnlock && (
                <button className="btn btn-outline" onClick={onUnlock} title={`قفل شده توسط ${record.locked_by}`}>
                  <i className="ti ti-lock-open"></i> باز کردن قفل
                </button>
              )
            ) : (
              onLock && (
                <button className="btn btn-outline" onClick={onLock}>
                  <i className="ti ti-lock"></i> قفل کردن
                </button>
              )
            )}
            <button className="btn btn-outline" onClick={onEdit}>
              <i className="ti ti-edit"></i> ویرایش
            </button>
          </div>
        </div>

        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem', marginBottom: '2rem',
        }}>
          {[...FIELDS.filter(f => f.key !== 'code' && f.key !== 'related'), ...customFields].map(f => (
            <div key={f.key} style={{ background: 'var(--bg-body)', padding: '1rem', borderRadius: 8 }}>
              <div style={{ fontSize: '0.75rem', opacity: 0.6, marginBottom: '0.25rem' }}>{f.fa}</div>
              <div style={{ fontWeight: 600, direction: f.key === 'amount' ? 'ltr' : 'rtl' }}>{f.key === 'amount' ? formatAmount(record[f.key]) : (record[f.key] || '—')}</div>
            </div>
          ))}
          {record.tags && record.tags.length > 0 && (
            <div style={{ gridColumn: '1 / -1', background: 'var(--bg-body)', padding: '1rem', borderRadius: 8 }}>
              <div style={{ fontSize: '0.75rem', opacity: 0.6, marginBottom: '0.5rem' }}>برچسب‌ها</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                {record.tags.map((tag: string) => (
                  <span key={tag} style={{
                    padding: '0.3rem 0.8rem', background: 'rgba(40, 199, 111, 0.12)',
                    color: 'var(--success)', borderRadius: 12, fontSize: '0.8rem',
                  }}>
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {relatedRecords.length > 0 ? (
          <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem' }}>
            <h4 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <i className="ti ti-link" style={{ color: 'var(--primary)' }}></i>
              برچسب‌های مرتبط ({relatedRecords.length})
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {relatedRecords.map((rel: RecordItem) => (
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
