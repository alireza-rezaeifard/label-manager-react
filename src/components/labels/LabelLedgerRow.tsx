import { memo } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Eye, Pencil, Star } from 'lucide-react';
import { formatAmount } from '../../utils/formatters';
import SearchHighlight from '../../utils/SearchHighlight';
import type { RecordItem } from '../../types';

interface LabelLedgerRowProps {
  record: RecordItem;
  selected: boolean;
  searchQuery: string;
  onToggle: () => void;
  onView: () => void;
  onEdit: () => void;
  onOpenDetails: () => void;
}

function LabelLedgerRow({ record, selected, searchQuery, onToggle, onView, onEdit, onOpenDetails }: LabelLedgerRowProps) {
  return (
    <div
      className={`lbx-lrow${selected ? ' selected' : ''}`}
      onClick={onToggle}
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      aria-label={`${selected ? 'لغو انتخاب' : 'انتخاب'} برچسب ${record.code}`}
      onKeyDown={(e: React.KeyboardEvent<HTMLDivElement>) => {
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          onToggle();
        }
      }}
    >
      <span onClick={(e: React.MouseEvent) => e.stopPropagation()}>
        <Checkbox checked={selected} onCheckedChange={onToggle} aria-label={`انتخاب ${record.code}`} />
      </span>
      <button
        type="button"
        className="code-badge lbx-code-btn"
        onClick={(e: React.MouseEvent) => { e.stopPropagation(); onOpenDetails(); }}
        title="مشاهده جزئیات برچسب"
      >
        <SearchHighlight text={record.code} query={searchQuery} />
      </button>
      <span className="lbx-cell" title={record.project}>
        <SearchHighlight text={record.project || '—'} query={searchQuery} />
      </span>
      <span className="lbx-cell lbx-dim">{record.type || '—'}</span>
      <span className="lbx-cell lbx-dim" dir="ltr">{record.date || '—'}</span>
      <span className="lbx-cell" title={record.party}>
        <SearchHighlight text={record.party || '—'} query={searchQuery} />
      </span>
      <span className="lbx-cell-amt" dir="ltr">{formatAmount(record.amount) || '—'}</span>
      <span className="lbx-tags-row">
        {record.tags && record.tags.length > 0 ? (
          <>
            {record.tags.slice(0, 2).map(tag => (
              <span key={tag} className="lbx-tag">{tag}</span>
            ))}
            {record.tags.length > 2 && <span className="lbx-tag-more">+{record.tags.length - 2}</span>}
          </>
        ) : (
          <span className="lbx-dim">—</span>
        )}
      </span>
      <span className="lbx-row-actions" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
        {record.is_favorite && <Star size={12} fill="var(--warning)" color="var(--warning)" />}
        <button type="button" className="lbx-icon-btn" onClick={onView} aria-label={`مشاهده ${record.code}`}>
          <Eye size={14} />
        </button>
        <button type="button" className="lbx-icon-btn" onClick={onEdit} aria-label={`ویرایش ${record.code}`}>
          <Pencil size={14} />
        </button>
      </span>
    </div>
  );
}

export default memo(LabelLedgerRow);
