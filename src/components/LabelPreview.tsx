import { useState } from 'react';
import { FIELDS } from '../data/fields';

const PREVIEW_PAGE_SIZE = 12;

export default function LabelPreview({ selectedRecords, onGoToRecords }) {
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
              {FIELDS.filter(f => f.key !== 'code').map(f => (
                <div key={f.key} className="d-flex justify-content-between mb-1" style={{ fontSize: '0.85rem' }}>
                  <span style={{ opacity: 0.6, fontWeight: 600 }}>{f.fa}:</span>
                  {f.key === 'related' ? (
                    <span style={{ opacity: 0.3 }}>—</span>
                  ) : (
                    <span style={{ maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {r[f.key] || '—'}
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
