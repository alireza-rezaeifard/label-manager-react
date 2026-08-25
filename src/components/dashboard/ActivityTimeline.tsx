import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Plus, Pencil, Trash2, RotateCcw, History, AlertTriangle,
  ArrowUpDown, Hash, Info, X, Activity,
} from 'lucide-react';
import { toPersianDateTime } from '../../lib/persianDate';
import { faNum } from './jalali';
import { DashboardSection, EmptyState } from './DashboardSection';

export interface ActivityItem {
  id: number | string;
  action: string;
  details?: string;
  created_at?: string;
  date?: string;
  time?: string;
  user_id?: number;
  user_name?: string;
  record_id?: number | null;
}

type ActionGroup = 'all' | 'create' | 'update' | 'delete' | 'restore' | 'order' | 'other';
type TimeFilter = 'all' | 'today' | 'week' | 'month';

const GROUPS: Array<{ key: ActionGroup; label: string; actions: string[] }> = [
  { key: 'create', label: 'ایجاد', actions: ['create'] },
  { key: 'update', label: 'ویرایش', actions: ['update', 'bulk-edit'] },
  { key: 'delete', label: 'حذف', actions: ['delete', 'trash', 'permanent_delete'] },
  { key: 'restore', label: 'بازیابی', actions: ['restore', 'restore_version'] },
  { key: 'order', label: 'تغییر ترتیب', actions: ['reorder', 'renumber'] },
];

const ACTION_META: Record<string, { label: string; group: ActionGroup; tone: string; icon: typeof Plus }> = {
  create: { label: 'ایجاد رکورد', group: 'create', tone: 'var(--success)', icon: Plus },
  update: { label: 'ویرایش رکورد', group: 'update', tone: 'var(--info)', icon: Pencil },
  'bulk-edit': { label: 'ویرایش گروهی', group: 'update', tone: 'var(--info)', icon: Pencil },
  delete: { label: 'حذف رکورد', group: 'delete', tone: 'var(--danger)', icon: Trash2 },
  trash: { label: 'انتقال به سطل زباله', group: 'delete', tone: 'var(--warning)', icon: Trash2 },
  permanent_delete: { label: 'حذف دائمی', group: 'delete', tone: 'var(--danger)', icon: AlertTriangle },
  restore: { label: 'بازیابی رکورد', group: 'restore', tone: 'var(--success)', icon: RotateCcw },
  restore_version: { label: 'بازگردانی نسخه', group: 'restore', tone: 'var(--info)', icon: History },
  reorder: { label: 'تغییر ترتیب', group: 'order', tone: 'var(--primary)', icon: ArrowUpDown },
  renumber: { label: 'تغییر کدگذاری', group: 'order', tone: 'var(--primary)', icon: Hash },
};

const TIME_FILTERS: Array<{ key: TimeFilter; label: string; days: number }> = [
  { key: 'today', label: 'امروز', days: 1 },
  { key: 'week', label: 'این هفته', days: 7 },
  { key: 'month', label: 'این ماه', days: 31 },
];

function metaOf(action: string) {
  return ACTION_META[action] || { label: action, group: 'other' as ActionGroup, tone: 'var(--primary)', icon: Info };
}

function parseTs(a: ActivityItem): Date | null {
  const raw = a.created_at || a.date || '';
  if (!raw) return null;
  const s = String(raw);
  const d = new Date(s.includes('T') ? s : s.replace(' ', 'T'));
  return isNaN(d.getTime()) ? null : d;
}

function relativeTimeFa(a: ActivityItem): string {
  const d = parseTs(a);
  if (!d) return '';
  const diff = Date.now() - d.getTime();
  if (diff < 0) return 'اکنون';
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'اکنون';
  if (mins < 60) return `${faNum(mins)} دقیقه پیش`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${faNum(hrs)} ساعت پیش`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${faNum(days)} روز پیش`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${faNum(weeks)} هفته پیش`;
  return d.toLocaleDateString('fa-IR');
}

/** Pure-with-respect-to-activities; "now" is read inside so render stays lint-clean. */
function filterActivities(activities: ActivityItem[], group: ActionGroup, time: TimeFilter): ActivityItem[] {
  const now = Date.now();
  let out = activities;
  if (group !== 'all') {
    const groupDef = GROUPS.find(g => g.key === group);
    out = groupDef
      ? out.filter(a => groupDef.actions.includes(a.action))
      : out.filter(a => !GROUPS.some(g => g.actions.includes(a.action)));
  }
  if (time !== 'all') {
    const def = TIME_FILTERS.find(t => t.key === time)!;
    const cutoff = now - def.days * 86400000;
    out = out.filter(a => {
      const d = parseTs(a);
      return d !== null && d.getTime() >= cutoff;
    });
  }
  return out;
}

const PAGE_STEP = 15;

interface Props {
  activities: ActivityItem[];
  onViewAll?: () => void;
}

export function ActivityTimeline({ activities, onViewAll }: Props) {
  const [group, setGroup] = useState<ActionGroup>('all');
  const [time, setTime] = useState<TimeFilter>('all');
  const [limit, setLimit] = useState(PAGE_STEP);
  const [selected, setSelected] = useState<ActivityItem | null>(null);

  const users = useMemo(
    () => new Set(activities.map(a => a.user_name || (a.user_id !== undefined ? `#${a.user_id}` : '')).filter(Boolean)),
    [activities],
  );

  const filtered = useMemo(
    () => filterActivities(activities, group, time),
    [activities, group, time],
  );

  const visible = filtered.slice(0, limit);

  return (
    <>
      <DashboardSection
        className="txd-span-12"
        title={<><Activity size={15} /> فعالیت‌های اخیر</>}
        note={`${faNum(filtered.length)} فعالیت`}
        action={
          onViewAll ? (
            <button type="button" className="txd-link" onClick={onViewAll}>
              مشاهده همه
            </button>
          ) : undefined
        }
      >
        <div className="txd-act-filters" role="group" aria-label="پالایش فعالیت‌ها">
          <button type="button" className={`txd-chip ${group === 'all' ? 'active' : ''}`} onClick={() => { setGroup('all'); setLimit(PAGE_STEP); }}>
            همه
          </button>
          {GROUPS.map(g => (
            <button key={g.key} type="button" className={`txd-chip ${group === g.key ? 'active' : ''}`} onClick={() => { setGroup(g.key); setLimit(PAGE_STEP); }}>
              {g.label}
            </button>
          ))}
          <span className="txd-chip-divider" aria-hidden="true" />
          <button type="button" className={`txd-chip ${time === 'all' ? 'active' : ''}`} onClick={() => { setTime('all'); setLimit(PAGE_STEP); }}>
            هر زمان
          </button>
          {TIME_FILTERS.map(t => (
            <button key={t.key} type="button" className={`txd-chip ${time === t.key ? 'active' : ''}`} onClick={() => { setTime(t.key); setLimit(PAGE_STEP); }}>
              {t.label}
            </button>
          ))}
          {users.size > 1 ? (
            <span className="txd-card-note">{faNum(users.size)} کاربر در این فضا فعال بوده‌اند</span>
          ) : null}
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            icon={<Activity size={20} />}
            title={activities.length === 0 ? 'فعالیتی ثبت نشده است' : 'فعالیتی با این پالایش پیدا نشد'}
            hint={
              activities.length === 0
                ? 'ایجاد، ویرایش و حذف رکوردها به‌صورت خودکار اینجا ثبت می‌شود.'
                : 'پالایش دیگری را امتحان کنید.'
            }
          />
        ) : (
          <>
            <div className="tdx-timeline">
              {visible.map((a, i) => {
                const meta = metaOf(a.action);
                const Icon = meta.icon;
                return (
                  <button
                    key={a.id ?? i}
                    type="button"
                    className="txd-act-item"
                    style={{ ['--dot-color' as string]: meta.tone }}
                    onClick={() => setSelected(a)}
                    aria-haspopup="dialog"
                  >
                    <span className="txd-act-dot"><Icon size={9} /></span>
                    <span className="txd-act-line-1">
                      <span className="txd-act-action">{meta.label}</span>
                      {a.user_name || a.user_id !== undefined ? (
                        <span className="txd-act-user">کاربر {a.user_name || `#${faNum(a.user_id ?? 0)}`}</span>
                      ) : null}
                      <span className="txd-act-time">{relativeTimeFa(a)}</span>
                    </span>
                    {a.details ? <span className="txd-act-detail">{a.details}</span> : null}
                  </button>
                );
              })}
            </div>
            {filtered.length > limit ? (
              <div className="txd-act-more">
                <button type="button" className="btn btn-outline btn-sm" onClick={() => setLimit(l => l + 25)}>
                  نمایش بیشتر ({faNum(filtered.length - limit)} مورد)
                </button>
              </div>
            ) : null}
          </>
        )}
      </DashboardSection>

      {selected ? <ActivityDetailDrawer item={selected} onClose={() => setSelected(null)} /> : null}
    </>
  );
}

function extractCode(details?: string): string | null {
  if (!details) return null;
  const m = details.match(/\b([A-Za-z][A-Za-z0-9]*(?:-\w+)*-\d+)\b/);
  return m ? m[1] : null;
}

function ActivityDetailDrawer({ item, onClose }: { item: ActivityItem; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const meta = metaOf(item.action);
  const Icon = meta.icon;
  const ts = parseTs(item);
  const code = extractCode(item.details);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <>
      <div className="txd-drawer-overlay" onClick={onClose} aria-hidden="true" />
      <div className="txd-drawer" role="dialog" aria-modal="true" aria-labelledby="txd-drawer-title">
        <div className="txd-drawer-head">
          <h3 className="txd-drawer-title" id="txd-drawer-title">جزئیات فعالیت</h3>
          <button ref={closeRef} type="button" className="txd-drawer-close" onClick={onClose} aria-label="بستن">
            <X size={15} />
          </button>
        </div>

        <span className="txd-drawer-badge" style={{ ['--dot-color' as string]: meta.tone }}>
          <Icon size={13} /> {meta.label}
        </span>

        <div className="txd-kv">
          <div className="txd-kv-label">کاربر</div>
          <div className="txd-kv-value">{item.user_name || (item.user_id !== undefined ? `#${faNum(item.user_id)}` : '—')}</div>
        </div>

        {(code || item.record_id != null) ? (
          <div className="txd-kv">
            <div className="txd-kv-label">رکورد</div>
            <div className="txd-kv-value mono">{code ?? `#${faNum(item.record_id!)}`}</div>
          </div>
        ) : null}

        <div className="txd-kv">
          <div className="txd-kv-label">زمان</div>
          <div className="txd-kv-value">{ts ? toPersianDateTime(ts) : (item.created_at || item.date || '—')}</div>
        </div>

        {item.details ? (
          <div className="txd-kv">
            <div className="txd-kv-label">جزئیات</div>
            <div className="txd-kv-value mono">{item.details}</div>
          </div>
        ) : null}
      </div>
    </>
  );
}
