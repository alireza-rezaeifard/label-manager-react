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
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const COLORS = ['#6366f1', '#10b981', '#ef4444', '#f59e0b', '#06b6d4', '#8b5cf6', '#ec4899', '#14b8a6'];

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

const ACTION_CONFIG: Record<string, { icon: string; color: string; bg: string; label: string }> = {
  create: { icon: 'ti-plus', color: '#10b981', bg: 'rgba(16,185,129,0.1)', label: 'ایجاد' },
  update: { icon: 'ti-edit', color: '#6366f1', bg: 'rgba(99,102,241,0.1)', label: 'ویرایش' },
  delete: { icon: 'ti-trash', color: '#ef4444', bg: 'rgba(239,68,68,0.1)', label: 'حذف' },
  trash: { icon: 'ti-trash', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', label: 'انتقال به سطل زباله' },
  restore: { icon: 'ti-rotate', color: '#06b6d4', bg: 'rgba(6,182,212,0.1)', label: 'بازیابی' },
  restore_version: { icon: 'ti-history', color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)', label: 'بازگردانی نسخه' },
  permanent_delete: { icon: 'ti-alert-triangle', color: '#ef4444', bg: 'rgba(239,68,68,0.15)', label: 'حذف دائمی' },
  reorder: { icon: 'ti-sort', color: '#06b6d4', bg: 'rgba(6,182,212,0.1)', label: 'تغییر ترتیب' },
  renumber: { icon: 'ti-number', color: '#14b8a6', bg: 'rgba(20,184,166,0.1)', label: 'تغییر کدگذاری' },
};

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
    <div className="fade-in">
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
          <div className="stat-label">پروژهها</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon warning"><Tag className="h-6 w-6" /></div>
          <div className="stat-value">{uniqueTypes.toLocaleString('fa-IR')}</div>
          <div className="stat-label">انواع برچسب</div>
        </div>
      </div>

      <div className="form-card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>مجموع مبالغ</h4>
          <span style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--primary)' }}>
            {formatAmount(totalAmount)}
          </span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.75rem' }}>
          {typeData.slice(0, 6).map((d, i) => (
            <div key={d.name} style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              padding: '0.5rem 0.75rem', background: 'var(--bg-body)', borderRadius: 8,
            }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: COLORS[i % COLORS.length], flexShrink: 0 }}></span>
              <span style={{ fontSize: '0.8125rem', flex: 1 }}>{d.name}</span>
              <span style={{ fontSize: '0.8125rem', fontWeight: 600, direction: 'ltr' }}>{d.value.toLocaleString('fa-IR')}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '1.25rem' }}>
        <div className="form-card" style={{ padding: '1.5rem' }}>
          <h4 style={{ margin: '0 0 1rem', fontSize: '1rem', fontWeight: 600 }}>رکوردها بر اساس نوع</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {cssBarData.map(d => (
              <div key={d.name}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem', marginBottom: '0.2rem' }}>
                  <span>{d.name}</span>
                  <span style={{ fontWeight: 600, direction: 'ltr' }}>{d.value.toLocaleString('fa-IR')}</span>
                </div>
                <div style={{ height: 20, background: 'var(--bg-body)', borderRadius: 6, overflow: 'hidden', position: 'relative' }}>
                  <div style={{
                    width: `${d.percent}%`, height: '100%', background: d.color,
                    borderRadius: 6, transition: 'width 0.6s ease', minWidth: d.value > 0 ? 20 : 0,
                  }}></div>
                </div>
              </div>
            ))}
            {cssBarData.length === 0 && <p style={{ opacity: 0.5, textAlign: 'center', padding: '2rem' }}>دادهای موجود نیست</p>}
          </div>
        </div>
        <div className="form-card" style={{ padding: '1.5rem' }}>
          <h4 style={{ margin: '0 0 1rem', fontSize: '1rem', fontWeight: 600 }}>رکوردها بر اساس پروژه (۱۰ تا برتر)</h4>
          <Chart
            options={barOptions(projectData.map(d => d.name))}
            series={[{ name: 'تعداد', data: projectData.map(d => d.value) }]}
            type="bar"
            height={280}
          />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '1.25rem' }}>
        <div className="form-card" style={{ padding: '1.5rem' }}>
          <h4 style={{ margin: '0 0 1rem', fontSize: '1rem', fontWeight: 600 }}>رکوردها بر اساس طرف حساب (۱۰ تا برتر)</h4>
          <Chart
            options={barOptions(partyData.map(d => d.name))}
            series={[{ name: 'تعداد', data: partyData.map(d => d.value) }]}
            type="bar"
            height={280}
          />
        </div>
        <div className="form-card" style={{ padding: '1.5rem' }}>
          <h4 style={{ margin: '0 0 1rem', fontSize: '1rem', fontWeight: 600 }}>مبلغ به تفکیک پروژه (۱۰ تا برتر)</h4>
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
        <div className="form-card" style={{ padding: '1.5rem', marginBottom: '1.25rem' }}>
          <h4 style={{ margin: '0 0 1rem', fontSize: '1rem', fontWeight: 600 }}>روند ماهانه</h4>
          <Chart
            options={{
              chart: { type: 'line', toolbar: { show: false } },
              colors: ['#6366f1'],
              xaxis: { categories: monthlyData.map(d => d.name), labels: { style: { fontSize: '11px' } } },
              stroke: { curve: 'smooth', width: 2 },
              markers: { size: 4, colors: ['#6366f1'] },
              dataLabels: { enabled: false },
              tooltip: { enabled: true },
            }}
            series={[{ name: 'تعداد', data: monthlyData.map(d => d.value) }]}
            type="line"
            height={300}
          />
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: tags.length > 0 || customFields.length > 0 ? '1fr 1fr' : '1fr', gap: '1.25rem', marginBottom: '1.25rem' }}>
        {tagData.length > 0 && (
          <div className="form-card" style={{ padding: '1.5rem' }}>
            <h4 style={{ margin: '0 0 1rem', fontSize: '1rem', fontWeight: 600 }}>توزیع برچسبها (Tags)</h4>
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
            <h4 style={{ margin: '0 0 1rem', fontSize: '1rem', fontWeight: 600 }}>فیلدهای سفارشی — نرخ تکمیل</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
              {customFieldSummary.map(f => (
                <div key={f.key}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem', marginBottom: '0.25rem' }}>
                    <span>{f.name}</span>
                    <span style={{ opacity: 0.6 }}>{f.filled.toLocaleString('fa-IR')} از {f.total.toLocaleString('fa-IR')} ({f.percent}%)</span>
                  </div>
                  <div style={{ height: 6, background: 'var(--border-color)', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ width: `${f.percent}%`, height: '100%', background: 'var(--primary)', borderRadius: 3, transition: 'width 0.5s' }}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="form-card" style={{ padding: '1.5rem', marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>آخرین رکوردها</h4>
          <Button variant="outline" size="sm" onClick={() => onTabChange('records')}>
            <ArrowLeft className="h-3.5 w-3.5" /> مشاهده همه
          </Button>
        </div>
        {recentRecords.length === 0 ? (
          <div className="empty-state" style={{ padding: '2rem' }}>
            <p style={{ opacity: 0.6 }}>هنوز رکوردی وجود ندارد</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <th style={{ padding: '0.5rem', textAlign: 'right', fontWeight: 600 }}>کد</th>
                  <th style={{ padding: '0.5rem', textAlign: 'right', fontWeight: 600 }}>پروژه</th>
                  <th style={{ padding: '0.5rem', textAlign: 'right', fontWeight: 600 }}>نوع</th>
                  <th style={{ padding: '0.5rem', textAlign: 'right', fontWeight: 600 }}>تاریخ</th>
                  <th style={{ padding: '0.5rem', textAlign: 'right', fontWeight: 600 }}>طرف حساب</th>
                  <th style={{ padding: '0.5rem', textAlign: 'right', fontWeight: 600 }}>مبلغ</th>
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>
              <History className="h-4 w-4 inline-block ml-1 opacity-60" />
              فعالیتهای اخیر
              <span style={{ fontSize: '0.75rem', fontWeight: 400, opacity: 0.5, marginRight: '0.5rem' }}>
                ({actLog.length.toLocaleString('fa-IR')})
              </span>
            </h4>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            {(showAllActivity ? actLog : actLog.slice(0, 20)).map((a, i) => {
              const cfg = ACTION_CONFIG[a.action] || { icon: 'ti-info-circle', color: 'var(--primary)', bg: 'rgba(99,102,241,0.08)', label: a.action };
              return (
                <div key={a.record_id || i} style={{
                  display: 'flex', alignItems: 'center', gap: '0.75rem',
                  padding: '0.5rem 0.75rem', background: cfg.bg, borderRadius: 8,
                  fontSize: '0.8125rem', transition: 'background 0.2s',
                }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: `${cfg.color}20`, flexShrink: 0,
                  }}>
                    <i className={`ti ${cfg.icon}`} style={{ color: cfg.color, fontSize: '0.875rem' }}></i>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{
                        padding: '0.1rem 0.5rem', borderRadius: 4, fontSize: '0.65rem', fontWeight: 600,
                        background: `${cfg.color}20`, color: cfg.color,
                      }}>{cfg.label}</span>
                      {a.user_id ? (
                        <span style={{ fontWeight: 500, fontSize: '0.75rem' }}>کاربر #{a.user_id}</span>
                      ) : null}
                    </div>
                    {a.details && (
                      <div style={{ opacity: 0.7, fontSize: '0.75rem', marginTop: '0.1rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {a.details}
                      </div>
                    )}
                  </div>
                  <span style={{
                    opacity: 0.45, fontSize: '0.6875rem', whiteSpace: 'nowrap', direction: 'ltr',
                  }}>
                    {relativeTime(a.created_at || a.date || a.time || '')}
                  </span>
                </div>
              );
            })}
          </div>
          {actLog.length > 20 && (
            <div style={{ textAlign: 'center', marginTop: '1rem' }}>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAllActivity(p => !p)}
              >
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
    </div>
  );
}
