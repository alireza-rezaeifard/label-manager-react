import { memo, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { FIELDS } from '../data/fields';
import { formatAmount } from '../utils/formatters';
import SearchHighlight from '../utils/SearchHighlight';
import type { RecordItem, CustomField } from '../types';
import { Eye, Pencil, Star, Lock } from 'lucide-react';

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
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
      whileHover={{ y: -4 }}
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
        <div className="flex items-center gap-2">
          <Checkbox
            checked={selected}
            onCheckedChange={onToggle}
          />
          <span className={`code-badge ${selected ? '' : 'bg-light text-muted'}`} style={record.color && !selected ? { borderLeft: `3px solid ${record.color}` } : {}}>
            {record.code ? <SearchHighlight text={record.code} query={searchQuery} /> : '—'}
          </span>
          {record.locked_by && (
            <Lock className="h-3.5 w-3.5 text-warning" title={`قفل شده توسط ${record.locked_by}`} />
          )}
        </div>
        {onToggleFavorite && (
          <button
            onClick={(e: React.MouseEvent) => { e.stopPropagation(); onToggleFavorite(); }}
            title={record.is_favorite ? 'حذف از علاقهمندیها' : 'افزودن به علاقهمندیها'}
            className="bg-transparent border-none p-1 cursor-pointer transition-transform hover:scale-110"
          >
            <Star
              className="h-4.5 w-4.5"
              fill={record.is_favorite ? '#f59e0b' : 'none'}
              style={{
                color: record.is_favorite ? '#f59e0b' : 'var(--text-color)',
                opacity: record.is_favorite ? 1 : 0.3,
              }}
            />
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
          <div className="mt-4 pt-4 border-t border-border">
            <span className="label-field-key block mb-2">مرتبط با:</span>
            <div className="flex flex-wrap gap-1.5">
              {relatedLabels.map(label => (
                <Badge key={label.code} variant="default" className="font-mono text-xs">
                  {label.code}
                </Badge>
              ))}
            </div>
          </div>
        )}
        {record.tags && record.tags.length > 0 && (
          <div className="mt-4 pt-4 border-t border-border">
            <div className="flex flex-wrap gap-1.5">
              {record.tags.map(tag => (
                <Badge key={tag} variant="success" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>
      <div className="label-card-footer">
        <div className="label-card-actions">
          <Button variant="outline" className="label-card-btn" onClick={(e: React.MouseEvent) => { e.stopPropagation(); onView(); }}>
            <Eye /> مشاهده
          </Button>
          <Button variant="default" className="label-card-btn" onClick={(e: React.MouseEvent) => { e.stopPropagation(); onEdit(); }}>
            <Pencil /> ویرایش
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

export default memo(RecordCard);
