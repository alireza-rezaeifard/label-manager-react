import { getTotalAmount } from '../utils/formatters';

export default function StatsCards({ records, selected, filtered }) {
  const selectedRecords = records.filter((_, i) => selected.has(i));

  const stats = [
    { icon: 'ti-files',     value: records.length,      label: 'مجموع رکوردها',  color: 'primary', delay: '0s' },
    { icon: 'ti-checkbox',  value: selected.size,        label: 'انتخاب شده',     color: 'success', delay: '0.1s' },
    { icon: 'ti-filter',    value: filtered.length,      label: 'فیلتر شده',      color: 'info',    delay: '0.2s' },
    { icon: 'ti-currency-dollar', value: getTotalAmount(selectedRecords), label: 'مجموع مبالغ', color: 'warning', delay: '0.3s' },
  ];

  return (
    <div className="stats-grid">
      {stats.map((s, i) => (
        <div key={i} className="stat-card fade-in" style={{ animationDelay: s.delay }}>
          <div className={`stat-icon ${s.color}`}>
            <i className={`ti ${s.icon}`}></i>
          </div>
          <div className="stat-value">{s.value}</div>
          <div className="stat-label">{s.label}</div>
        </div>
      ))}
    </div>
  );
}
