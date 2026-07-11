import { memo, useMemo } from 'react';
import { getTotalAmount } from '../utils/formatters';
import { Files, CheckSquare, Filter, DollarSign } from 'lucide-react';
import type { RecordItem } from '../types';

const StatsCards = memo(function StatsCards({ records, selected, filtered }: { records: RecordItem[]; selected: Set<number>; filtered: RecordItem[] }) {
  const selectedRecords = useMemo(
    () => records.filter((_, i) => selected.has(i)),
    [records, selected]
  );

  const totalAmount = useMemo(() => getTotalAmount(selectedRecords), [selectedRecords]);

  const stats = useMemo(() => [
    { icon: Files,        value: records.length,      label: 'مجموع رکوردها',  color: 'primary', delay: '0s' },
    { icon: CheckSquare,  value: selected.size,        label: 'انتخاب شده',     color: 'success', delay: '0.1s' },
    { icon: Filter,       value: filtered.length,      label: 'فیلتر شده',      color: 'info',    delay: '0.2s' },
    { icon: DollarSign,   value: totalAmount,          label: 'مجموع مبالغ',     color: 'warning', delay: '0.3s' },
  ], [records.length, selected.size, filtered.length, totalAmount]);

  return (
    <div className="stats-grid">
      {stats.map((s, i) => {
        const Icon = s.icon;
        return (
          <div key={i} className="stat-card fade-in" style={{ animationDelay: s.delay }}>
            <div className={`stat-icon ${s.color}`}>
              <Icon className="h-6 w-6" />
            </div>
            <div className="stat-value">{s.value}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        );
      })}
    </div>
  );
});

export default StatsCards;
