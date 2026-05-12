import { memo } from 'react';
import { FIELDS } from '../data/fields';

function Checkbox({ checked, onChange }) {
  return (
    <div className={`custom-checkbox ${checked ? 'checked' : ''}`} onClick={onChange}>
      {checked && <i className="ti ti-check" style={{ fontSize: 12 }}></i>}
    </div>
  );
}

function RecordCard({ record, selected, onToggle, onEdit, onView, getRelatedLabels, index, onDragStart, onDragOver, onDragEnd, onDrop }) {
  const relatedLabels = getRelatedLabels ? getRelatedLabels(record.related) : [];

  return (
    <div
      className={`label-card ${selected ? 'selected' : ''} fade-in`}
      onClick={onToggle}
      draggable
      onDragStart={(e) => { e.dataTransfer.setData('text/plain', index); onDragStart && onDragStart(e); }}
      onDragOver={(e) => { e.preventDefault(); onDragOver && onDragOver(e); }}
      onDragEnd={onDragEnd}
      onDrop={(e) => { e.preventDefault(); onDrop && onDrop(e); }}
    >
      {record.color && (
        <div style={{ height: 4, background: record.color }} />
      )}
      <div className="label-card-header">
        <div className="d-flex align-items-center gap-2">
          <Checkbox checked={selected} onChange={onToggle} />
          <span className={`code-badge ${selected ? '' : 'bg-light text-muted'}`} style={record.color && !selected ? { borderLeft: `3px solid ${record.color}` } : {}}>
            {record.code || '—'}
          </span>
        </div>
      </div>
      <div className="label-card-body">
        <div className="label-fields-grid">
          {FIELDS.filter(f => f.key !== 'code' && f.key !== 'related').map(f => (
            <div key={f.key} className="label-field-item">
              <span className="label-field-key">{f.fa}</span>
              <span className="label-field-value">{record[f.key] || '—'}</span>
            </div>
          ))}
        </div>
        {relatedLabels.length > 0 && (
          <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
            <span className="label-field-key" style={{ display: 'block', marginBottom: '0.5rem' }}>مرتبط با:</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
              {relatedLabels.map(label => (
                <span
                  key={label.code}
                  style={{
                    padding: '0.25rem 0.6rem', background: 'rgba(115, 103, 240, 0.1)',
                    color: 'var(--primary)', borderRadius: 6, fontSize: '0.75rem',
                    fontFamily: 'monospace',
                  }}
                >
                  {label.code}
                </span>
              ))}
            </div>
          </div>
        )}
        {record.tags && record.tags.length > 0 && (
          <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
              {record.tags.map(tag => (
                <span key={tag} style={{
                  padding: '0.2rem 0.6rem', background: 'rgba(40, 199, 111, 0.12)',
                  color: 'var(--success)', borderRadius: 12, fontSize: '0.7rem',
                }}>
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
      <div className="label-card-footer">
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn btn-outline btn-sm" style={{ flex: 1 }} onClick={(e) => { e.stopPropagation(); onView(); }}>
            <i className="ti ti-eye"></i> مشاهده
          </button>
          <button className="btn btn-outline btn-sm" style={{ flex: 1 }} onClick={(e) => { e.stopPropagation(); onEdit(); }}>
            <i className="ti ti-edit"></i> ویرایش
          </button>
        </div>
      </div>
    </div>
  );
}

export default memo(RecordCard);
