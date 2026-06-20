import { memo, useState, useCallback } from 'react';
import { FIELDS } from '../data/fields';
import { formatAmount } from '../utils/formatters';
import SearchHighlight from '../utils/SearchHighlight';
import type { RecordItem, CustomField } from '../types';

interface CheckboxProps {
  checked: boolean;
  onChange: () => void;
}

function Checkbox({ checked, onChange }: CheckboxProps) {
  return (
    <div className={`custom-checkbox ${checked ? 'checked' : ''}`} onClick={onChange}>
      {checked && <i className="ti ti-check" style={{ fontSize: 12 }}></i>}
    </div>
  );
}

interface RecordCardProps {
  record: RecordItem;
  selected: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onView: () => void;
  onToggleFavorite?: () => void;
  getRelatedLabels?: (related: string[]) => { code: string }[];
  index: number;
  onDragStart?: (e: React.DragEvent) => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDragEnd?: () => void;
  onDrop?: (e: React.DragEvent) => void;
  onInlineEdit?: (index: number, field: string, value: string) => void;
  customFields?: CustomField[];
  searchQuery?: string;
}

function RecordCard({ record, selected, onToggle, onEdit, onView, onToggleFavorite, getRelatedLabels, index, onDragStart, onDragOver, onDragEnd, onDrop, onInlineEdit, customFields = [], searchQuery = '' }: RecordCardProps) {
  const relatedLabels = getRelatedLabels ? getRelatedLabels(record.related) : [];
  const [editField, setEditField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  const handleInlineSave = useCallback(() => {
    if (editField !== null && onInlineEdit) {
      onInlineEdit(index, editField, editValue);
    }
    setEditField(null);
  }, [editField, editValue, index, onInlineEdit]);

  return (
    <div
      className={`label-card ${selected ? 'selected' : ''} fade-in`}
      onClick={onToggle}
      draggable
      onDragStart={(e: React.DragEvent) => { e.dataTransfer.setData('text/plain', String(index)); onDragStart?.(e); }}
      onDragOver={(e: React.DragEvent) => { e.preventDefault(); onDragOver?.(e); }}
      onDragEnd={onDragEnd}
      onDrop={(e: React.DragEvent) => { e.preventDefault(); onDrop?.(e); }}
    >
      {record.color && (
        <div style={{ height: 4, background: record.color }} />
      )}
      <div className="label-card-header">
        <div className="d-flex align-items-center gap-2">
          <Checkbox checked={selected} onChange={onToggle} />
          <span className={`code-badge ${selected ? '' : 'bg-light text-muted'}`} style={record.color && !selected ? { borderLeft: `3px solid ${record.color}` } : {}}>
            {record.code ? <SearchHighlight text={record.code} query={searchQuery} /> : '—'}
          </span>
          {record.locked_by && (
            <i className="ti ti-lock" style={{ fontSize: '0.85rem', color: 'var(--warning)' }} title={`قفل شده توسط ${record.locked_by}`}></i>
          )}
        </div>
        {onToggleFavorite && (
          <button
            className="btn btn-sm"
            onClick={(e: React.MouseEvent) => { e.stopPropagation(); onToggleFavorite(); }}
            title={record.is_favorite ? 'حذف از علاقه‌مندی‌ها' : 'افزودن به علاقه‌مندی‌ها'}
            style={{ background: 'none', border: 'none', padding: '0.25rem', cursor: 'pointer' }}
          >
            <i className={`ti ${record.is_favorite ? 'ti-star' : 'ti-star'}`} style={{
              fontSize: '1.1rem',
              color: record.is_favorite ? '#ff9f43' : 'var(--text-color)',
              opacity: record.is_favorite ? 1 : 0.3,
            }}></i>
          </button>
        )}
      </div>
      <div className="label-card-body">
        <div className="label-fields-grid">
          {[...FIELDS.filter(f => f.key !== 'code' && f.key !== 'related'), ...customFields].map(f => (
            <div key={f.key} className="label-field-item" onDoubleClick={(e: React.MouseEvent) => { e.stopPropagation(); if (onInlineEdit) { setEditField(f.key); setEditValue((record as any)[f.key] || ''); } }}>
              <span className="label-field-key">{f.fa}</span>
              {editField === f.key ? (
                <input type="text" className="inline-edit-input" autoFocus
                  value={editValue}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditValue(e.target.value)}
                  onBlur={handleInlineSave}
                  onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => { if (e.key === 'Enter') handleInlineSave(); if (e.key === 'Escape') setEditField(null); }}
                  onClick={(e: React.MouseEvent) => e.stopPropagation()}
                />
              ) : (
                <span className="label-field-value">{f.key === 'amount' ? formatAmount((record as any)[f.key]) : (f.key === 'project' || f.key === 'party' ? <SearchHighlight text={((record as any)[f.key] || '—')} query={searchQuery} /> : ((record as any)[f.key] || '—'))}</span>
              )}
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
          <button className="btn btn-outline btn-sm" style={{ flex: 1 }} onClick={(e: React.MouseEvent) => { e.stopPropagation(); onView(); }}>
            <i className="ti ti-eye"></i> مشاهده
          </button>
          <button className="btn btn-outline btn-sm" style={{ flex: 1 }} onClick={(e: React.MouseEvent) => { e.stopPropagation(); onEdit(); }}>
            <i className="ti ti-edit"></i> ویرایش
          </button>
        </div>
      </div>
    </div>
  );
}

export default memo(RecordCard);
