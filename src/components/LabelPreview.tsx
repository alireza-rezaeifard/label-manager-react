import { useState } from 'react';
import { FIELDS } from '../data/fields';
import { formatAmount } from '../utils/formatters';

const PREVIEW_PAGE_SIZE = 12;

export default function LabelPreview({ selectedRecords, onGoToRecords, customFields = [] as any[], enabledCustomFieldKeys = [] as string[], exporting = false, exportProgress = 0 }) {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(selectedRecords.length / PREVIEW_PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pagedRecords = selectedRecords.slice((safePage - 1) * PREVIEW_PAGE_SIZE, safePage * PREVIEW_PAGE_SIZE);

  if (!selectedRecords.length) {
    return (
      <div className="empty-state">
        <div className="empty-icon">
          <i className="ti ti-selector"></i>
        </div>
        <h3 style={{ marginBottom: '0.5rem' }}>برچسبی انتخاب نشده</h3>
        <p style={{ opacity: 0.7, marginBottom: '1.5rem' }}>در تب سوابق، رکوردها را انتخاب کنید</p>
        <button className="btn btn-primary" onClick={onGoToRecords}>
          <i className="ti ti-arrow-right"></i> رفتن به سوابق
        </button>
      </div>
    );
  }

  const startItem = (safePage - 1) * PREVIEW_PAGE_SIZE + 1;
  const endItem = Math.min(safePage * PREVIEW_PAGE_SIZE, selectedRecords.length);

  return (
    <div className="fade-in">
      {exporting && (
        <div style={{ marginBottom: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem', fontSize: '0.85rem' }}>
            <span>در حال آماده‌سازی...</span>
            <span>{Math.round(exportProgress)}%</span>
          </div>
          <div style={{ width: '100%', height: 6, background: 'var(--border-color)', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{ width: `${exportProgress}%`, height: '100%', background: 'var(--primary)', borderRadius: 3, transition: 'width 0.3s ease' }} />
          </div>
        </div>
      )}
      <div className="d-flex align-items-center gap-2 mb-4 p-3" style={{
        background: 'var(--card-bg)', borderRadius: 12,
        border: '1px solid var(--border-color)',
      }}>
        <i className="ti ti-scissors" style={{ fontSize: '1.5rem', color: 'var(--primary)' }}></i>
        <span>خطوط برش (✂) برای بریدن پس از چاپ - {`${selectedRecords.length} برچسب`}</span>
      </div>

      <div className="preview-grid" dir="rtl" id="preview-grid">
        {pagedRecords.map((r, i) => (
          <div key={r.code || i} className="preview-label" style={{ direction: 'rtl', minHeight: 200 }}>
            <span className="cut-marker">✂</span>
            <div>
              <div style={{
                fontFamily: 'monospace', fontWeight: 'bold', fontSize: '1rem',
                textAlign: 'center', paddingBottom: '0.5rem', marginBottom: '0.5rem',
                borderBottom: '1px solid var(--border-color)', direction: 'ltr',
              }}>
                {r.code}
              </div>
              {[...FIELDS, ...customFields.filter(f => enabledCustomFieldKeys.includes(f.key))].filter(f => f.key !== 'code').map(f => (
                <div key={f.key} className="d-flex justify-content-between mb-1" style={{ fontSize: '0.85rem' }}>
                  <span style={{ opacity: 0.6, fontWeight: 600 }}>{f.fa}:</span>
                  {f.key === 'related' ? (
                    <div dir="ltr" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem', justifyContent: 'flex-end' }}>
                      {Array.isArray(r.related) && r.related.length > 0
                        ? r.related.map((code, ci) => (
                            <span key={ci} style={{
                              fontSize: '0.75rem', padding: '0.1rem 0.4rem', borderRadius: 4,
                              background: '#7c3aed', color: '#fff', fontWeight: 600,
                            }}>{code}</span>
                          ))
                        : <span style={{ opacity: 0.6 }}>—</span>
                      }
                    </div>
                  ) : (
                    <span style={{ maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {f.key === 'amount' ? formatAmount(r[f.key]) : (r[f.key] || '—')}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="pagination" style={{ marginTop: '1.5rem' }}>
          <button className="pagination-btn" disabled={safePage <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>
            قبلی
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
            <button key={p} className={`pagination-btn ${p === safePage ? 'active' : ''}`} onClick={() => setPage(p)}>
              {p}
            </button>
          ))}
          <button className="pagination-btn" disabled={safePage >= totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}>
            بعدی
          </button>
          <span style={{ marginRight: '1rem', opacity: 0.6, fontSize: '0.85rem' }}>
            {startItem}-{endItem} از {selectedRecords.length}
          </span>
        </div>
      )}
    </div>
  );
}
