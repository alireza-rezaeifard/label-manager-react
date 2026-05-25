import { useMemo } from 'react';
import Chart from 'react-apexcharts';
import { formatAmount } from '../utils/formatters';
import type { RecordItem, CustomField } from '../types';

const COLORS = ['#7367f0', '#28c76f', '#ea5455', '#ff9f43', '#00cfe8', '#a8aaaf', '#6d62e0', '#20a862'];

interface Props {
  records: RecordItem[];
  customFields: CustomField[];
  tags: string[];
  activityLog: Array<{ action: string; details?: string; date?: string; time?: string }>;
  onTabChange: (tab: string) => void;
}

function pieOptions(labels: string[]) {
  return {
    chart: { type: 'pie' as const },
    labels,
    colors: COLORS,
    legend: { position: 'bottom' as const, fontSize: '13px' },
    dataLabels: { enabled: false },
    tooltip: { enabled: true },
    responsive: [{ breakpoint: 480, options: { chart: { width: 200 } } }],
  };
}

function barOptions(categories: string[], formatter?: (v: number) => string) {
  return {
    chart: { type: 'bar' as const, toolbar: { show: false } },
    colors: COLORS,
    xaxis: { categories, labels: { rotate: -45, style: { fontSize: '11px' } } },
    plotOptions: { bar: { borderRadius: 4, columnWidth: '70%' } },
    dataLabels: { enabled: false },
    tooltip: {
      y: { formatter: formatter ? (v: number) => formatter(v) : undefined },
    },
    legend: { show: false },
  };
}

export default function DashboardTab({ records, customFields, tags, activityLog, onTabChange }: Props) {
  const totalAmount = useMemo(() => {
    let total = 0;
    for (const r of records) {
      const num = String(r.amount || '').replace(/[^0-9]/g, '');
      if (num) total += Number(num);
    }
    return total;
  }, [records]);

  const uniqueProjects = useMemo(() => new Set(records.map(r => r.project).filter(Boolean)).size, [records]);
  const uniqueTypes = useMemo(() => new Set(records.map(r => r.type).filter(Boolean)).size, [records]);

  const typeData = useMemo(() => {
    const map: Record<string, number> = {};
    records.forEach(r => { const k = r.type || 'نامشخص'; map[k] = (map[k] || 0) + 1; });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [records]);

  const projectData = useMemo(() => {
    const map: Record<string, number> = {};
    records.forEach(r => { const k = r.project || 'نامشخص'; map[k] = (map[k] || 0) + 1; });
    return Object.entries(map).sort(([, a], [, b]) => b - a).slice(0, 10).map(([name, value]) => ({ name, value }));
  }, [records]);

  const partyData = useMemo(() => {
    const map: Record<string, number> = {};
    records.forEach(r => { const k = r.party || 'نامشخص'; map[k] = (map[k] || 0) + 1; });
    return Object.entries(map).sort(([, a], [, b]) => b - a).slice(0, 10).map(([name, value]) => ({ name, value }));
  }, [records]);

  const monthlyData = useMemo(() => {
    const map: Record<string, number> = {};
    records.forEach(r => {
      const month = (r.date || '').slice(0, 7);
      if (month) map[month] = (map[month] || 0) + 1;
    });
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b)).map(([name, value]) => ({ name, value }));
  }, [records]);

  const amountByProject = useMemo(() => {
    const map: Record<string, number> = {};
    records.forEach(r => {
      const project = r.project || 'نامشخص';
      const num = parseInt(String(r.amount || '0').replace(/[^0-9]/g, ''), 10) || 0;
      map[project] = (map[project] || 0) + num;
    });
    return Object.entries(map).sort(([, a], [, b]) => b - a).slice(0, 10).map(([name, value]) => ({ name, value }));
  }, [records]);

  const recentRecords = useMemo(() => [...records].slice(-10).reverse(), [records]);

  const tagData = useMemo(() => {
    if (!tags || tags.length === 0) return [];
    const map: Record<string, number> = {};
    tags.forEach(t => { map[t] = 0; });
    records.forEach(r => {
      if (r.tags && Array.isArray(r.tags)) {
        r.tags.forEach(t => { if (map[t] !== undefined) map[t]++; });
      }
    });
    return Object.entries(map).sort(([, a], [, b]) => b - a).map(([name, value]) => ({ name, value }));
  }, [records, tags]);

  const customFieldSummary = useMemo(() => {
    if (!customFields || customFields.length === 0) return [];
    return customFields.map(f => {
      const filled = records.filter(r => r[f.key] && String(r[f.key]).trim() !== '').length;
      return { name: f.fa || f.label, key: f.key, filled, total: records.length, percent: records.length > 0 ? Math.round((filled / records.length) * 100) : 0 };
    });
  }, [records, customFields]);

  const actLog = activityLog || [];

  return (
    <div className="fade-in">
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon primary"><i className="ti ti-files"></i></div>
          <div className="stat-value">{records.length.toLocaleString('fa-IR')}</div>
          <div className="stat-label">مجموع رکوردها</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon success"><i className="ti ti-currency-dollar"></i></div>
          <div className="stat-value">{totalAmount.toLocaleString('fa-IR', { useGrouping: true })}</div>
          <div className="stat-label">مجموع مبالغ</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon info"><i className="ti ti-building"></i></div>
          <div className="stat-value">{uniqueProjects.toLocaleString('fa-IR')}</div>
          <div className="stat-label">پروژه‌ها</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon warning"><i className="ti ti-tag"></i></div>
          <div className="stat-value">{uniqueTypes.toLocaleString('fa-IR')}</div>
          <div className="stat-label">انواع برچسب</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
        <div className="form-card" style={{ padding: '1.5rem' }}>
          <h4 style={{ margin: '0 0 1rem' }}>رکوردها بر اساس نوع</h4>
          <Chart
            options={pieOptions(typeData.map(d => d.name))}
            series={typeData.map(d => d.value)}
            type="pie"
            height={280}
          />
        </div>
        <div className="form-card" style={{ padding: '1.5rem' }}>
          <h4 style={{ margin: '0 0 1rem' }}>رکوردها بر اساس پروژه (۱۰ تا برتر)</h4>
          <Chart
            options={barOptions(projectData.map(d => d.name))}
            series={[{ name: 'تعداد', data: projectData.map(d => d.value) }]}
            type="bar"
            height={280}
          />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
        <div className="form-card" style={{ padding: '1.5rem' }}>
          <h4 style={{ margin: '0 0 1rem' }}>رکوردها بر اساس طرف حساب (۱۰ تا برتر)</h4>
          <Chart
            options={barOptions(partyData.map(d => d.name))}
            series={[{ name: 'تعداد', data: partyData.map(d => d.value) }]}
            type="bar"
            height={280}
          />
        </div>
        <div className="form-card" style={{ padding: '1.5rem' }}>
          <h4 style={{ margin: '0 0 1rem' }}>مبلغ به تفکیک پروژه (۱۰ تا برتر)</h4>
          <Chart
            options={barOptions(
              amountByProject.map(d => d.name),
              (v: number) => Number(v).toLocaleString('fa-IR')
            )}
            series={[{ name: 'مبلغ', data: amountByProject.map(d => d.value) }]}
            type="bar"
            height={280}
          />
        </div>
      </div>

      {monthlyData.length > 0 && (
        <div className="form-card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
          <h4 style={{ margin: '0 0 1rem' }}>روند ماهانه</h4>
          <Chart
            options={{
              chart: { type: 'line', toolbar: { show: false } },
              colors: ['#7367f0'],
              xaxis: { categories: monthlyData.map(d => d.name), labels: { style: { fontSize: '11px' } } },
              stroke: { curve: 'smooth', width: 2 },
              markers: { size: 4, colors: ['#7367f0'] },
              dataLabels: { enabled: false },
              tooltip: { enabled: true },
            }}
            series={[{ name: 'تعداد', data: monthlyData.map(d => d.value) }]}
            type="line"
            height={300}
          />
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: tags.length > 0 || customFields.length > 0 ? '1fr 1fr' : '1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
        {tagData.length > 0 && (
          <div className="form-card" style={{ padding: '1.5rem' }}>
            <h4 style={{ margin: '0 0 1rem' }}>توزیع برچسب‌ها (Tags)</h4>
            <Chart
              options={pieOptions(tagData.map(d => d.name))}
              series={tagData.map(d => d.value)}
              type="pie"
              height={250}
            />
          </div>
        )}

        {customFieldSummary.length > 0 && (
          <div className="form-card" style={{ padding: '1.5rem' }}>
            <h4 style={{ margin: '0 0 1rem' }}>فیلدهای سفارشی — نرخ تکمیل</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {customFieldSummary.map(f => (
                <div key={f.key}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.25rem' }}>
                    <span>{f.name}</span>
                    <span style={{ opacity: 0.6 }}>{f.filled.toLocaleString('fa-IR')} از {f.total.toLocaleString('fa-IR')} ({f.percent}%)</span>
                  </div>
                  <div style={{ height: 8, background: 'var(--border-color)', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ width: `${f.percent}%`, height: '100%', background: 'var(--primary)', borderRadius: 4, transition: 'width 0.5s' }}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="form-card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h4 style={{ margin: 0 }}>آخرین رکوردها</h4>
          <button className="btn btn-outline btn-sm" onClick={() => onTabChange('records')}>
            <i className="ti ti-arrow-left"></i> مشاهده همه
          </button>
        </div>
        {recentRecords.length === 0 ? (
          <div className="empty-state" style={{ padding: '2rem' }}>
            <p style={{ opacity: 0.6 }}>هنوز رکوردی وجود ندارد</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <th style={{ padding: '0.5rem', textAlign: 'right' }}>کد</th>
                  <th style={{ padding: '0.5rem', textAlign: 'right' }}>پروژه</th>
                  <th style={{ padding: '0.5rem', textAlign: 'right' }}>نوع</th>
                  <th style={{ padding: '0.5rem', textAlign: 'right' }}>تاریخ</th>
                  <th style={{ padding: '0.5rem', textAlign: 'right' }}>طرف حساب</th>
                  <th style={{ padding: '0.5rem', textAlign: 'right' }}>مبلغ</th>
                </tr>
              </thead>
              <tbody>
                {recentRecords.map((r, i) => (
                  <tr key={r.code || i} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '0.5rem', fontFamily: 'monospace' }}>{r.code}</td>
                    <td style={{ padding: '0.5rem' }}>{r.project}</td>
                    <td style={{ padding: '0.5rem' }}>{r.type}</td>
                    <td style={{ padding: '0.5rem', direction: 'ltr', textAlign: 'left' }}>{r.date}</td>
                    <td style={{ padding: '0.5rem' }}>{r.party}</td>
                    <td style={{ padding: '0.5rem' }}>{formatAmount(r.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {actLog.length > 0 && (
        <div className="form-card" style={{ padding: '1.5rem' }}>
          <h4 style={{ margin: '0 0 1rem' }}>فعالیت‌های اخیر</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {actLog.slice(0, 15).map((a, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: '0.75rem',
                padding: '0.5rem 0.75rem', background: 'var(--bg-body)', borderRadius: 8, fontSize: '0.85rem',
              }}>
                <i className={`ti ${a.action === 'create' ? 'ti-plus' : a.action === 'update' ? 'ti-edit' : a.action === 'delete' ? 'ti-trash' : 'ti-info-circle'}`}
                  style={{ color: a.action === 'delete' ? 'var(--danger)' : 'var(--primary)', fontSize: '1rem' }}></i>
                <span>{a.details || a.action}</span>
                <span style={{ opacity: 0.5, marginRight: 'auto', fontSize: '0.75rem' }}>{a.date || a.time || ''}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
