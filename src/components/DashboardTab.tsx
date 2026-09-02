import { useMemo, useState } from 'react';
import Chart from 'react-apexcharts';
import { formatAmount } from '../utils/formatters';
import type { RecordItem, CustomField } from '../types';
import {
  Files,
  CalendarDays,
  Building2,
  Tag,
  ArrowLeft,
  History,
  ChevronUp,
  ChevronDown,
  Wallet,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

/* Persian-themed qualitative palette — kept in sync with src/styles/persian-redesign.css */
const COLORS = ['#176b87', '#c8902f', '#16856b', '#c2414b', '#2374a8', '#8a5a44', '#6a4c93', '#3f8f7a'];

interface Props {
  records: RecordItem[];
  customFields: CustomField[];
  tags: string[];
  activityLog: Array<{ action: string; details?: string; date?: string; time?: string; created_at?: string; user_id?: number; record_id?: number | null }>;
  onTabChange: (tab: string) => void;
}

function relativeTime(dateStr?: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr.includes('T') ? dateStr : dateStr + 'T00:00:00Z');
  if (isNaN(d.getTime())) return dateStr;
  const now = Date.now();
  const diff = now - d.getTime();
  if (diff < 0) return 'اکنون';
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'اکنون';
  if (mins < 60) return `${mins} دقیقه پیش`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} ساعت پیش`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days} روز پیش`;
  const weeks = Math.floor(days / 7);
  if (weeks < 4) return `${weeks} هفته پیش`;
  return d.toLocaleDateString('fa-IR');
}

const ACTION_CONFIG: Record<string, { icon: string; color: string; label: string }> = {
  create: { icon: 'ti-plus', color: '#16856b', label: 'ایجاد' },
  update: { icon: 'ti-edit', color: '#176b87', label: 'ویرایش' },
  delete: { icon: 'ti-trash', color: '#c2414b', label: 'حذف' },
  trash: { icon: 'ti-trash', color: '#c8902f', label: 'انتقال به سطل زباله' },
  restore: { icon: 'ti-rotate', color: '#2374a8', label: 'بازیابی' },
  restore_version: { icon: 'ti-history', color: '#6a4c93', label: 'بازگردانی نسخه' },
  permanent_delete: { icon: 'ti-alert-triangle', color: '#a5323d', label: 'حذف دائمی' },
  reorder: { icon: 'ti-sort', color: '#2374a8', label: 'تغییر ترتیب' },
  renumber: { icon: 'ti-number', color: '#3f8f7a', label: 'تغییر کدگذاری' },
};

function pieOptions(labels: string[]) {
  return {
    chart: { type: 'pie' as const, fontFamily: 'Vazirmatn, Tahoma, sans-serif' },
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
    chart: { type: 'bar' as const, toolbar: { show: false }, fontFamily: 'Vazirmatn, Tahoma, sans-serif' },
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
  const [showAllActivity, setShowAllActivity] = useState(false);

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

  const recordsThisWeek = useMemo(() => {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    return records.filter(r => {
      const created = String(r['created_at'] || r.date || '');
      if (!created) return false;
      const d = new Date(created.includes('T') ? created : created + 'T00:00:00Z');
      return !isNaN(d.getTime()) && d >= weekAgo;
    }).length;
  }, [records]);

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

  const cssBarData = useMemo(() => {
    if (typeData.length === 0) return [];
    const maxVal = Math.max(...typeData.map(d => d.value));
    return typeData.map((d, i) => ({
      ...d,
      percent: maxVal > 0 ? (d.value / maxVal) * 100 : 0,
      color: COLORS[i % COLORS.length],
    }));
  }, [typeData]);

  return (
    <div className="dsb fade-in">
      {/* ── Stat Summary ── */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon primary"><Files className="h-6 w-6" /></div>
          <div className="stat-value">{records.length.toLocaleString('fa-IR')}</div>
          <div className="stat-label">مجموع رکوردها</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon success"><CalendarDays className="h-6 w-6" /></div>
          <div className="stat-value">{recordsThisWeek.toLocaleString('fa-IR')}</div>
          <div className="stat-label">رکوردهای این هفته</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon info"><Building2 className="h-6 w-6" /></div>
          <div className="stat-value">{uniqueProjects.toLocaleString('fa-IR')}</div>
          <div className="stat-label">پروژه‌ها</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon warning"><Tag className="h-6 w-6" /></div>
          <div className="stat-value">{uniqueTypes.toLocaleString('fa-IR')}</div>
          <div className="stat-label">انواع برچسب</div>
        </div>
      </div>

      {/* ── Total Amount ── */}
      <div className="form-card dsb-card">
        <div className="dsb-total-head">
          <div className="dsb-total-title">
            <span className="dsb-total-icon"><Wallet className="h-4 w-4" /></span>
            <h4>مجموع مبالغ</h4>
          </div>
          <span className="dsb-total-value">{formatAmount(totalAmount)}</span>
        </div>
        <div className="dsb-total-grid">
          {typeData.slice(0, 6).map((d, i) => (
            <div key={d.name} className="dsb-total-pill">
              <span className="dsb-dot" style={{ background: COLORS[i % COLORS.length] }} />
              <span className="dsb-pill-name">{d.name}</span>
              <span className="dsb-pill-value">{d.value.toLocaleString('fa-IR')}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Type / Project ── */}
      <div className="dsb-grid-2">
        <div className="form-card dsb-card">
          <h4 className="dsb-card-title">رکوردها بر اساس نوع</h4>
          <div className="dsb-bars">
            {cssBarData.map(d => (
              <div key={d.name} className="dsb-bar-row">
                <div className="dsb-bar-labels">
                  <span>{d.name}</span>
                  <span className="dsb-bar-num">{d.value.toLocaleString('fa-IR')}</span>
                </div>
                <div className="dsb-bar-track">
                  <div className="dsb-bar-fill" style={{ width: `${d.percent}%`, background: d.color }} />
                </div>
              </div>
            ))}
            {cssBarData.length === 0 && <p className="dsb-empty-note">داده‌ای موجود نیست</p>}
          </div>
        </div>
        <div className="form-card dsb-card">
          <h4 className="dsb-card-title">رکوردها بر اساس پروژه (۱۰ تا برتر)</h4>
          <Chart
            options={barOptions(projectData.map(d => d.name))}
            series={[{ name: 'تعداد', data: projectData.map(d => d.value) }]}
            type="bar"
            height={280}
          />
        </div>
      </div>

      {/* ── Party / Amount ── */}
      <div className="dsb-grid-2">
        <div className="form-card dsb-card">
          <h4 className="dsb-card-title">رکوردها بر اساس طرف حساب (۱۰ تا برتر)</h4>
          <Chart
            options={barOptions(partyData.map(d => d.name))}
            series={[{ name: 'تعداد', data: partyData.map(d => d.value) }]}
            type="bar"
            height={280}
          />
        </div>
        <div className="form-card dsb-card">
          <h4 className="dsb-card-title">مبلغ به تفکیک پروژه (۱۰ تا برتر)</h4>
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

      {/* ── Monthly Trend ── */}
      {monthlyData.length > 0 && (
        <div className="form-card dsb-card">
          <h4 className="dsb-card-title">روند ماهانه</h4>
          <Chart
            options={{
              chart: { type: 'line', toolbar: { show: false }, fontFamily: 'Vazirmatn, Tahoma, sans-serif' },
              colors: ['#176b87'],
              xaxis: { categories: monthlyData.map(d => d.name), labels: { style: { fontSize: '11px' } } },
              stroke: { curve: 'smooth', width: 2 },
              markers: { size: 4, colors: ['#176b87'] },
              dataLabels: { enabled: false },
              tooltip: { enabled: true },
            }}
            series={[{ name: 'تعداد', data: monthlyData.map(d => d.value) }]}
            type="line"
            height={300}
          />
        </div>
      )}

      {/* ── Tags / Custom Fields ── */}
      {(tagData.length > 0 || customFieldSummary.length > 0) && (
        <div className={tagData.length > 0 && customFieldSummary.length > 0 ? 'dsb-grid-2' : 'dsb-grid-1'}>
          {tagData.length > 0 && (
            <div className="form-card dsb-card">
              <h4 className="dsb-card-title">توزیع برچسب‌ها (Tags)</h4>
              <Chart
                options={pieOptions(tagData.map(d => d.name))}
                series={tagData.map(d => d.value)}
                type="pie"
                height={250}
              />
            </div>
          )}

          {customFieldSummary.length > 0 && (
            <div className="form-card dsb-card">
              <h4 className="dsb-card-title">فیلدهای سفارشی — نرخ تکمیل</h4>
              <div className="dsb-bars">
                {customFieldSummary.map(f => (
                  <div key={f.key} className="dsb-bar-row">
                    <div className="dsb-bar-labels">
                      <span>{f.name}</span>
                      <span className="dsb-bar-num dsb-muted">{f.filled.toLocaleString('fa-IR')} از {f.total.toLocaleString('fa-IR')} ({f.percent}%)</span>
                    </div>
                    <div className="dsb-bar-track thin">
                      <div className="dsb-bar-fill" style={{ width: `${f.percent}%`, background: 'var(--primary)' }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Recent Records ── */}
      <div className="form-card dsb-card">
        <div className="dsb-card-head">
          <h4 className="dsb-card-title dsb-card-title-flush">آخرین رکوردها</h4>
          <Button variant="outline" size="sm" onClick={() => onTabChange('records')}>
            <ArrowLeft className="h-3.5 w-3.5" /> مشاهده همه
          </Button>
        </div>
        {recentRecords.length === 0 ? (
          <div className="empty-state dsb-empty-state">
            <p>هنوز رکوردی وجود ندارد</p>
          </div>
        ) : (
          <div className="dsb-table-wrap">
            <table className="dsb-table">
              <thead>
                <tr>
                  <th>کد</th>
                  <th>پروژه</th>
                  <th>نوع</th>
                  <th>تاریخ</th>
                  <th>طرف حساب</th>
                  <th>مبلغ</th>
                </tr>
              </thead>
              <tbody>
                {recentRecords.map((r, i) => (
                  <tr key={r.code || i}>
                    <td className="dsb-mono">{r.code}</td>
                    <td>{r.project}</td>
                    <td>{r.type}</td>
                    <td className="dsb-ltr">{r.date}</td>
                    <td>{r.party}</td>
                    <td>{formatAmount(r.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Recent Activity ── */}
      {actLog.length > 0 && (
        <div className="form-card dsb-card">
          <div className="dsb-card-head">
            <h4 className="dsb-card-title dsb-card-title-flush">
              <History className="h-4 w-4 dsb-title-icon" />
              فعالیت‌های اخیر
              <span className="dsb-muted dsb-count">({actLog.length.toLocaleString('fa-IR')})</span>
            </h4>
          </div>
          <div className="dsb-activity-list">
            {(showAllActivity ? actLog : actLog.slice(0, 20)).map((a, i) => {
              const cfg = ACTION_CONFIG[a.action] || { icon: 'ti-info-circle', color: 'var(--primary)', label: a.action };
              return (
                <div key={a.record_id || i} className="dsb-act-item" style={{ '--acc': cfg.color } as React.CSSProperties}>
                  <div className="dsb-act-icon">
                    <i className={`ti ${cfg.icon}`}></i>
                  </div>
                  <div className="dsb-act-body">
                    <div className="dsb-act-top">
                      <span className="dsb-act-badge">{cfg.label}</span>
                      {a.user_id ? <span className="dsb-act-user">کاربر #{a.user_id}</span> : null}
                    </div>
                    {a.details && <div className="dsb-act-details">{a.details}</div>}
                  </div>
                  <span className="dsb-act-time">{relativeTime(a.created_at || a.date || a.time || '')}</span>
                </div>
              );
            })}
          </div>
          {actLog.length > 20 && (
            <div className="dsb-more-wrap">
              <Button variant="outline" size="sm" onClick={() => setShowAllActivity(p => !p)}>
                {showAllActivity ? (
                  <><ChevronUp className="h-3.5 w-3.5" /> نمایش کمتر</>
                ) : (
                  <><ChevronDown className="h-3.5 w-3.5" /> نمایش بیشتر ({actLog.length - 20} مورد)</>
                )}
              </Button>
            </div>
          )}
        </div>
      )}

      <style>{`
        .dsb {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }

        .dsb-card {
          padding: 1.5rem;
        }

        .dsb-card-title {
          margin: 0 0 1rem;
          font-size: 1rem;
          font-weight: 700;
          color: var(--text-color);
          display: flex;
          align-items: center;
          gap: 0.4rem;
        }

        .dsb-card-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 1rem;
          flex-wrap: wrap;
          gap: 0.5rem;
        }

        .dsb-card-title-flush {
          margin: 0;
        }

        .dsb-title-icon {
          opacity: 0.6;
        }

        .dsb-muted {
          color: var(--text-muted);
          font-weight: 400;
        }

        .dsb-count {
          font-size: 0.75rem;
          margin-right: 0.25rem;
        }

        /* ── Responsive chart/panel grid ── */
        .dsb-grid-2 {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
          gap: 1.25rem;
        }

        .dsb-grid-1 {
          display: grid;
          grid-template-columns: 1fr;
        }

        /* ── Total amount card ── */
        .dsb-total-head {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
          flex-wrap: wrap;
          gap: 0.75rem;
        }

        .dsb-total-title {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .dsb-total-title h4 {
          margin: 0;
          font-size: 1rem;
          font-weight: 700;
        }

        .dsb-total-icon {
          width: 32px;
          height: 32px;
          border-radius: 10px 4px 10px 4px;
          background: var(--persian-gold-soft);
          color: var(--persian-gold);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .dsb-total-value {
          font-size: 1.6rem;
          font-weight: 800;
          color: var(--primary);
          font-variant-numeric: tabular-nums;
        }

        .dsb-total-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
          gap: 0.75rem;
        }

        .dsb-total-pill {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.6rem 0.85rem;
          background: var(--surface-soft);
          border-radius: 10px 4px 10px 4px;
          min-width: 0;
        }

        .dsb-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          flex-shrink: 0;
        }

        .dsb-pill-name {
          font-size: 0.8125rem;
          flex: 1;
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .dsb-pill-value {
          font-size: 0.8125rem;
          font-weight: 700;
          direction: ltr;
          font-variant-numeric: tabular-nums;
        }

        /* ── CSS bar charts ── */
        .dsb-bars {
          display: flex;
          flex-direction: column;
          gap: 0.65rem;
        }

        .dsb-bar-row { min-width: 0; }

        .dsb-bar-labels {
          display: flex;
          justify-content: space-between;
          gap: 0.5rem;
          font-size: 0.8125rem;
          margin-bottom: 0.3rem;
        }

        .dsb-bar-labels span:first-child {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .dsb-bar-num {
          font-weight: 700;
          direction: ltr;
          flex-shrink: 0;
        }

        .dsb-bar-track {
          height: 18px;
          background: var(--surface-soft);
          border-radius: 6px;
          overflow: hidden;
        }

        .dsb-bar-track.thin {
          height: 7px;
        }

        .dsb-bar-fill {
          height: 100%;
          border-radius: 6px;
          transition: width 0.6s ease;
        }

        .dsb-empty-note {
          text-align: center;
          padding: 2rem 0;
          opacity: 0.5;
          margin: 0;
        }

        .dsb-empty-state {
          padding: 2rem;
        }

        .dsb-empty-state p {
          margin: 0;
          opacity: 0.6;
        }

        /* ── Table ── */
        .dsb-table-wrap {
          overflow-x: auto;
        }

        .dsb-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.8125rem;
        }

        .dsb-table th {
          padding: 0.6rem 0.5rem;
          text-align: right;
          font-weight: 600;
          white-space: nowrap;
        }

        .dsb-table td {
          padding: 0.6rem 0.5rem;
          border-top: 1px solid var(--border-color);
        }

        .dsb-mono {
          font-family: 'JetBrains Mono', Consolas, monospace;
        }

        .dsb-ltr {
          direction: ltr;
          text-align: left;
        }

        /* ── Activity feed ── */
        .dsb-activity-list {
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
        }

        .dsb-act-item {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.55rem 0.75rem;
          border-radius: 10px 4px 10px 4px;
          background: color-mix(in srgb, var(--acc) 9%, transparent);
          transition: background 0.2s ease;
        }

        .dsb-act-icon {
          width: 28px;
          height: 28px;
          border-radius: 8px 3px 8px 3px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: color-mix(in srgb, var(--acc) 18%, transparent);
          color: var(--acc);
          flex-shrink: 0;
          font-size: 0.875rem;
        }

        .dsb-act-body {
          flex: 1;
          min-width: 0;
        }

        .dsb-act-top {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .dsb-act-badge {
          padding: 0.1rem 0.55rem;
          border-radius: 5px;
          font-size: 0.65rem;
          font-weight: 700;
          background: color-mix(in srgb, var(--acc) 20%, transparent);
          color: var(--acc);
        }

        .dsb-act-user {
          font-weight: 500;
          font-size: 0.75rem;
        }

        .dsb-act-details {
          opacity: 0.7;
          font-size: 0.75rem;
          margin-top: 0.15rem;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .dsb-act-time {
          opacity: 0.5;
          font-size: 0.6875rem;
          white-space: nowrap;
          direction: ltr;
          flex-shrink: 0;
        }

        .dsb-more-wrap {
          text-align: center;
          margin-top: 1rem;
        }

        @media (max-width: 640px) {
          .dsb-card { padding: 1.1rem; }
          .dsb-total-value { font-size: 1.3rem; }
          .dsb-act-time { display: none; }
        }
      `}</style>
    </div>
  );
}
