import { memo } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Eye, Pencil, Info, Star, Lock } from 'lucide-react';
import { formatAmount } from '../../utils/formatters';
import SearchHighlight from '../../utils/SearchHighlight';
import type { RecordItem, CustomField } from '../../types';

interface LabelStubProps {
  record: RecordItem;
  selected: boolean;
  customFields: CustomField[];
  searchQuery: string;
  onToggle: () => void;
  onView: () => void;
  onEdit: () => void;
  onOpenDetails: () => void;
  onToggleFavorite?: () => void;
}

function LabelStub({ record, selected, customFields, searchQuery, onToggle, onView, onEdit, onOpenDetails, onToggleFavorite }: LabelStubProps) {
  const extraFields = customFields.filter(f => {
    const v = (record as Record<string, unknown>)[f.key];
    return v !== undefined && v !== null && String(v).trim() !== '';
  }).slice(0, 2);

  const renderValue = (v: unknown): string => {
    const raw = String(v ?? '');
    return /^[0-9۰-۹,]+$/.test(raw) ? formatAmount(raw) : raw;
  };

  return (
    <div
      className={`lbx-stub${selected ? ' selected' : ''}`}
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      aria-label={`${selected ? 'لغو انتخاب' : 'انتخاب'} برچسب ${record.code}`}
      onClick={onToggle}
      onKeyDown={(e: React.KeyboardEvent<HTMLDivElement>) => {
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          onToggle();
        }
      }}
    >
      <div className="lbx-stub-head">
        <Checkbox
          checked={selected}
          onCheckedChange={onToggle}
          onClick={(e: React.MouseEvent) => e.stopPropagation()}
          aria-label={`انتخاب ${record.code}`}
        />
        <button
          type="button"
          className="code-badge lbx-code-btn"
          onClick={(e: React.MouseEvent) => { e.stopPropagation(); onOpenDetails(); }}
          title="مشاهده جزئیات برچسب"
        >
          <SearchHighlight text={record.code} query={searchQuery} />
        </button>
        <span className="lbx-head-tools">
          {record.locked_by && (
            <Lock className="lbx-lock" size={13} aria-label={`قفل شده توسط ${record.locked_by}`} />
          )}
          {onToggleFavorite && (
            <button
              type="button"
              className="lbx-star"
              onClick={(e: React.MouseEvent) => { e.stopPropagation(); onToggleFavorite(); }}
              aria-label={record.is_favorite ? 'حذف از علاقه‌مندی‌ها' : 'افزودن به علاقه‌مندی‌ها'}
            >
              <Star size={15} fill={record.is_favorite ? 'var(--warning)' : 'none'} color={record.is_favorite ? 'var(--warning)' : 'var(--text-color)'} opacity={record.is_favorite ? 1 : 0.35} />
            </button>
          )}
          <button
            type="button"
            className="lbx-info-btn"
            onClick={(e: React.MouseEvent) => { e.stopPropagation(); onOpenDetails(); }}
            aria-label={`جزئیات برچسب ${record.code}`}
          >
            <Info size={15} />
          </button>
        </span>
      </div>

      <div className="ds-section-rule lbx-rule" />

      <div className="lbx-stub-body">
        <div className="lbx-eyebrow">
          <SearchHighlight text={record.type || '—'} query={searchQuery} />
          <span className="lbx-eyebrow-dot">·</span>
          <span className="lbx-eyebrow-proj">
            <SearchHighlight text={record.project || '—'} query={searchQuery} />
          </span>
        </div>

        <div className="lbx-amount" dir="ltr">{formatAmount(record.amount) || '—'}</div>

        <div className="lbx-party">
          <SearchHighlight text={record.party || '—'} query={searchQuery} />
        </div>

        <div className="lbx-meta">
          <span dir="ltr">{record.date || ''}</span>
          {extraFields.length > 0 && (
            <span className="lbx-meta-cf">
              {extraFields.map(f => (
                <span key={f.key} className="lbx-cf-pair">
                  <span className="lbx-cf-key">{f.fa}</span>
                  <span dir="ltr">{renderValue((record as Record<string, unknown>)[f.key])}</span>
                </span>
              ))}
            </span>
          )}
        </div>

        {record.tags && record.tags.length > 0 && (
          <div className="lbx-tags-row">
            {record.tags.slice(0, 3).map(tag => (
              <span key={tag} className="lbx-tag">{tag}</span>
            ))}
            {record.tags.length > 3 && <span className="lbx-tag-more">+{record.tags.length - 3}</span>}
          </div>
        )}
      </div>

      <div className="lbx-stub-foot">
        <button
          type="button"
          className="btn btn-outline btn-sm label-card-btn"
          onClick={(e: React.MouseEvent) => { e.stopPropagation(); onView(); }}
        >
          <Eye size={14} /> مشاهده
        </button>
        <button
          type="button"
          className="btn btn-outline btn-sm label-card-btn"
          onClick={(e: React.MouseEvent) => { e.stopPropagation(); onEdit(); }}
        >
          <Pencil size={14} /> ویرایش
        </button>
      </div>
    </div>
  );
}

export default memo(LabelStub);
