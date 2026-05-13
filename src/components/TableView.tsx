import { memo, useState } from 'react';
import { FIELDS } from '../data/fields';
import type { Record } from '../types';

function TableView({
  records, selected, onToggle, onEdit, onView: _onView, onSort, sortBy, sortOrder, recordToIndex,
}: {
  records: Record[];
  selected: Set<number>;
  onToggle: (i: number) => void;
  onEdit: (i: number) => void;
  onView: (i: number) => void;
  onSort?: (field: string) => void;
  sortBy?: string | null;
  sortOrder?: string;
  recordToIndex: Map<Record, number>;
}) {
  const displayFields = FIELDS.filter(f => f.key !== 'related');
  const [editCell, setEditCell] = useState<{ idx: number; field: string } | null>(null);
  const [editValue, setEditValue] = useState('');

  const handleCellDoubleClick = (idx: number, field: string, value: string) => {
    if (field === 'code') return;
    setEditCell({ idx, field });
    setEditValue(value || '');
  };

  const handleCellSave = () => {
    if (!editCell) return;
    const record = records[editCell.idx];
    if (record) {
      onEdit(editCell.idx);
    }
    setEditCell(null);
  };

  const handleSortClick = (field: string) => {
    if (onSort) onSort(field);
  };

  return (
    <div className="table-responsive-wrapper">
      <div className="table-view">
      <div className="table-header">
        <div className="table-cell" style={{ flex: '0 0 40px', maxWidth: 40 }}></div>
        {displayFields.map(f => (
          <div key={f.key} className="table-cell" onClick={() => handleSortClick(f.key)}
            style={{ cursor: onSort ? 'pointer' : 'default', userSelect: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
            <span>{f.fa}</span>
            {sortBy === f.key && (
              <i className={`ti ${sortOrder === 'asc' ? 'ti-chevron-up' : 'ti-chevron-down'}`} style={{ fontSize: '0.75rem', opacity: 0.6 }}></i>
            )}
            {sortBy !== f.key && onSort && (
              <i className="ti ti-arrows-sort" style={{ fontSize: '0.7rem', opacity: 0.3 }}></i>
            )}
          </div>
        ))}
      </div>
      {records.map((r) => {
        const realIdx = recordToIndex.get(r);
        if (realIdx === undefined) return null;
        const isSelected = selected.has(realIdx);
        return (
          <div key={r.id || r.code} className={`table-row ${isSelected ? 'selected' : ''}`}
            onClick={() => onToggle(realIdx)}>
            <div className="table-cell" style={{ flex: '0 0 40px', maxWidth: 40 }}
              onClick={e => e.stopPropagation()}>
              <div className={`custom-checkbox ${isSelected ? 'checked' : ''}`}
                onClick={() => onToggle(realIdx)}>
                {isSelected && <i className="ti ti-check" style={{ fontSize: 12 }}></i>}
              </div>
            </div>
            {displayFields.map(f => {
              const isEditing = editCell?.idx === realIdx && editCell?.field === f.key;
              return (
                <div key={f.key} className={`table-cell ${f.key === 'code' ? 'code-cell' : ''} ${f.key === 'amount' ? 'amount-cell' : ''}`}
                  onDoubleClick={(e) => { e.stopPropagation(); handleCellDoubleClick(realIdx, f.key, r[f.key] || ''); }}>
                  {isEditing ? (
                    <input type="text" className="inline-edit-input" autoFocus
                      value={editValue}
                      onChange={e => setEditValue(e.target.value)}
                      onBlur={handleCellSave}
                      onKeyDown={e => { if (e.key === 'Enter') handleCellSave(); if (e.key === 'Escape') setEditCell(null); }}
                      onClick={e => e.stopPropagation()}
                    />
                  ) : (
                    <span>{r[f.key] || '—'}</span>
                  )}
                </div>
              );
            })}
          </div>
        );
      })}
      {records.length === 0 && (
        <div style={{ textAlign: 'center', padding: '3rem', opacity: 0.5 }}>هیچ رکوردی یافت نشد</div>
      )}
    </div>
    </div>
  );
}

export default memo(TableView);
