import { useMemo } from 'react';
import type { CustomField, RecordItem } from '../types';
import {
  addJalaliDays,
  jalaliDayLabel,
  jalaliDayRange,
  jalaliKey,
  jalaliMonthLabel,
  jalaliMonthRange,
  jalaliSeasonLabel,
  parseRecordDate,
  todayJalali,
} from '../components/dashboard/jalali';

export type PeriodKey = 'today' | 'week' | 'month' | 'quarter' | 'all';
export type Granularity = 'day' | 'month' | 'season';

const J_MONTH_SHORT = ['فرو', 'ارد', 'خرد', 'تیر', 'مرد', 'شهر', 'مهر', 'آبا', 'آذر', 'دی', 'بهم', 'اسف'];
const J_MONTHS = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهم', 'اسفند'];
const J_SEASON_SHORT = ['بهار', 'تابستان', 'پاییز', 'زمستان'];

export interface TrendPoint {
  key: string;
  label: string;
  full: string;
  value: number;
}

export interface NamedCount {
  name: string;
  value: number;
}

export interface QualityField {
  key: string;
  name: string;
  filled: number;
  total: number;
  percent: number;
}

function parseRecordTimestamp(raw?: string): Date | null {
  if (!raw) return null;
  const s = String(raw).trim();
  if (!s) return null;
  const d = new Date(s.includes('T') ? s : s.replace(' ', 'T'));
  return isNaN(d.getTime()) ? null : d;
}

function recordTs(r: RecordItem): Date | null {
  return parseRecordTimestamp(String(r.created_at || '')) ?? parseRecordTimestamp(r.date ? String(r.date) : '');
}

function parseAmount(r: RecordItem): number {
  const normalized = String(r.amount || '').replace(/[۰-۹]/g, d => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)));
  const num = normalized.replace(/[^0-9]/g, '');
  return num ? Number(num) : 0;
}

function countBy(records: RecordItem[], pick: (r: RecordItem) => string | undefined): NamedCount[] {
  const map = new Map<string, number>();
  for (const r of records) {
    const k = pick(r)?.trim() || '';
    if (!k) continue;
    map.set(k, (map.get(k) || 0) + 1);
  }
  return [...map.entries()].map(([name, value]) => ({ name, value }));
}

function topBy(data: NamedCount[], n: number): NamedCount[] {
  return [...data].sort((a, b) => b.value - a.value).slice(0, n);
}

function periodWindow(period: PeriodKey): { from: string; to: string } | null {
  if (period === 'all') return null;
  const today = todayJalali();
  let from: ReturnType<typeof todayJalali>;
  switch (period) {
    case 'today':
      from = today;
      break;
    case 'week':
      from = addJalaliDays(today, -6);
      break;
    case 'month':
      from = { jy: today.jy, jm: today.jm, jd: 1 };
      break;
    case 'quarter': {
      const qStart = Math.floor((today.jm - 1) / 3) * 3 + 1;
      from = { jy: today.jy, jm: qStart, jd: 1 };
      break;
    }
    default:
      return null;
  }
  return { from: jalaliKey(from), to: jalaliKey(today) };
}

function buildTrend(records: RecordItem[], granularity: Granularity): { points: TrendPoint[]; peak: TrendPoint | null; dated: number } {
  const dated: Array<{ parts: NonNullable<ReturnType<typeof parseRecordDate>> }> = [];
  for (const r of records) {
    const parts = parseRecordDate(r.date);
    if (parts) dated.push({ parts });
  }
  if (dated.length === 0) return { points: [], peak: null, dated: 0 };

  const keys = dated.map(d => d.parts);
  const minKey = keys.reduce((a, b) => (jalaliKey(b) < jalaliKey(a) ? b : a));
  const maxKey = keys.reduce((a, b) => (jalaliKey(b) > jalaliKey(a) ? b : a));

  const counts = new Map<string, number>();
  for (const p of keys) {
    const k =
      granularity === 'day' ? jalaliKey(p)
        : granularity === 'season' ? `${p.jy}-Q${Math.floor((p.jm - 1) / 3)}`
          : `${p.jy}/${String(p.jm).padStart(2, '0')}`;
    counts.set(k, (counts.get(k) || 0) + 1);
  }

  let points: TrendPoint[] = [];
  if (granularity === 'day') {
    const days = jalaliDayRange(minKey, maxKey);
    if (days) {
      points = days.map(p => ({
        key: jalaliKey(p),
        label: String(p.jd),
        full: jalaliDayLabel(p),
        value: counts.get(jalaliKey(p)) || 0,
      }));
    }
  }
  if (points.length === 0 && granularity !== 'season') {
    const months = jalaliMonthRange(
      { jy: minKey.jy, jm: minKey.jm, jd: 1 },
      { jy: maxKey.jy, jm: maxKey.jm, jd: 1 },
    );
    if (months) {
      points = months.map(p => {
        const key = `${p.jy}/${String(p.jm).padStart(2, '0')}`;
        return { key, label: J_MONTH_SHORT[p.jm - 1], full: jalaliMonthLabel(p), value: counts.get(key) || 0 };
      });
    }
  }
  if (granularity === 'season') {
    const quarters: Array<{ jy: number; q: number }> = [];
    let cur = { jy: minKey.jy, q: Math.floor((minKey.jm - 1) / 3) };
    const end = { jy: maxKey.jy, q: Math.floor((maxKey.jm - 1) / 3) };
    let guard = 0;
    while ((cur.jy < end.jy || (cur.jy === end.jy && cur.q <= end.q)) && guard++ < 16) {
      quarters.push(cur);
      cur = cur.q === 3 ? { jy: cur.jy + 1, q: 0 } : { jy: cur.jy, q: cur.q + 1 };
    }
    points = quarters.map(({ jy, q }) => {
      const key = `${jy}-Q${q}`;
      return {
        key,
        label: J_SEASON_SHORT[q],
        full: jalaliSeasonLabel({ jy, jm: q * 3 + 1 }),
        value: counts.get(key) || 0,
      };
    });
  }
  if (points.length === 0) {
    points = [...counts.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => {
        const m = key.match(/^(\d+)\/(\d+)$/);
        if (m) {
          const jm = Number(m[2]);
          return { key, label: J_MONTH_SHORT[jm - 1] || key, full: `${J_MONTHS[jm - 1] || ''} ${faNumSafe(Number(m[1]))}`.trim(), value };
        }
        return { key, label: key, full: key, value };
      });
  }

  const peak = points.reduce<TrendPoint | null>((best, p) => (!best || p.value > best.value ? p : best), null);
  return { points, peak: peak && peak.value > 0 ? peak : null, dated: dated.length };
}

function faNumSafe(n: number): string {
  try { return n.toLocaleString('fa-IR', { useGrouping: false }); } catch { return String(n); }
}

function weeklySeries(records: RecordItem[], weeks: number): number[] {
  const now = Date.now();
  const out = new Array<number>(weeks).fill(0);
  for (const r of records) {
    const d = recordTs(r);
    if (!d) continue;
    const diffWeeks = Math.floor((now - d.getTime()) / (7 * 24 * 60 * 60 * 1000));
    if (diffWeeks >= 0 && diffWeeks < weeks) out[weeks - 1 - diffWeeks] += 1;
  }
  return out;
}

export function useDashboardStats(args: {
  records: RecordItem[];
  customFields: CustomField[];
  tags: string[];
  period: PeriodKey;
  granularity: Granularity;
}) {
  const { records, customFields, tags, period, granularity } = args;

  const scoped = useMemo(() => {
    const win = periodWindow(period);
    if (!win) return records;
    return records.filter(r => {
      const p = parseRecordDate(r.date);
      if (!p) return false;
      const k = jalaliKey(p);
      return k >= win.from && k <= win.to;
    });
  }, [records, period]);

  const kpis = useMemo(() => {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 86400000);
    const twoWeeksAgo = new Date(now.getTime() - 14 * 86400000);
    let thisWeek = 0;
    let prevWeek = 0;
    let sawAnyTimestamp = false;
    for (const r of records) {
      const d = recordTs(r);
      if (!d) continue;
      sawAnyTimestamp = true;
      if (d >= weekAgo) thisWeek += 1;
      else if (d >= twoWeeksAgo) prevWeek += 1;
    }
    const projects = new Set<string>();
    const types = new Set<string>();
    let total = 0;
    for (const r of records) {
      const proj = (r.project || '').trim();
      if (proj) projects.add(proj);
      const typ = (r.type || '').trim();
      if (typ) types.add(typ);
      total += parseAmount(r);
    }
    const delta = sawAnyTimestamp && (thisWeek > 0 || prevWeek > 0)
      ? (prevWeek === 0 ? null : Math.round(((thisWeek - prevWeek) / prevWeek) * 100))
      : null;
    return {
      totalRecords: records.length,
      totalAmount: total,
      thisWeek,
      thisWeekDelta: delta,
      projects: projects.size,
      types: types.size,
      sparkline: weeklySeries(records, 8),
    };
  }, [records]);

  const trend = useMemo(() => buildTrend(scoped, granularity), [scoped, granularity]);

  const typeData = useMemo(() => topBy(countBy(scoped, r => r.type), 10), [scoped]);
  const projectData = useMemo(() => topBy(countBy(scoped, r => r.project), 8), [scoped]);
  const partyData = useMemo(() => topBy(countBy(scoped, r => r.party), 8), [scoped]);

  const tagData = useMemo(() => {
    if (!tags || tags.length === 0) return [] as NamedCount[];
    const known = new Set(tags);
    const map = new Map<string, number>();
    for (const t of tags) map.set(t, 0);
    for (const r of scoped) {
      if (Array.isArray(r.tags)) {
        for (const t of r.tags) {
          if (known.has(t)) map.set(t, (map.get(t) || 0) + 1);
        }
      }
    }
    return [...map.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [scoped, tags]);

  const amountByProject = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of scoped) {
      const k = (r.project || '').trim() || 'نامشخص';
      map.set(k, (map.get(k) || 0) + parseAmount(r));
    }
    const entries = [...map.entries()].filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
    const total = entries.reduce((s, [, v]) => s + v, 0);
    if (total === 0) return { total: 0, rows: [] as Array<{ name: string; value: number; pct: number }>, otherPct: 0 };
    const head = entries.slice(0, 4);
    const tailSum = entries.slice(4).reduce((s, [, v]) => s + v, 0);
    const rows = head.map(([name, value]) => ({ name, value, pct: (value / total) * 100 }));
    if (tailSum > 0) rows.push({ name: 'سایر', value: tailSum, pct: (tailSum / total) * 100 });
    return { total, rows, otherPct: tailSum > 0 ? (tailSum / total) * 100 : 0 };
  }, [scoped]);

  const quality = useMemo(() => {
    if (!customFields || customFields.length === 0 || records.length === 0) {
      return { available: false, overall: 0, needsReview: 0, fields: [] as QualityField[] };
    }
    const fields: QualityField[] = customFields.map(f => {
      let filled = 0;
      for (const r of records) {
        const v = r[f.key];
        if (v !== undefined && v !== null && String(v).trim() !== '') filled += 1;
      }
      return {
        key: f.key,
        name: f.fa || f.label,
        filled,
        total: records.length,
        percent: records.length > 0 ? Math.round((filled / records.length) * 100) : 0,
      };
    }).sort((a, b) => a.percent - b.percent || a.name.localeCompare(b.name, 'fa'));
    const overall = Math.round(fields.reduce((s, f) => s + f.percent, 0) / fields.length);
    return { available: true, overall, needsReview: fields.filter(f => f.percent < 70).length, fields };
  }, [records, customFields]);

  const recentRecords = useMemo(() => {
    const indexed = records.map((r, i) => ({ r, i }));
    indexed.sort((a, b) => {
      const ta = recordTs(a.r)?.getTime() ?? NaN;
      const tb = recordTs(b.r)?.getTime() ?? NaN;
      if (!isNaN(ta) && !isNaN(tb)) return tb - ta;
      if (!isNaN(ta)) return -1;
      if (!isNaN(tb)) return 1;
      return b.i - a.i;
    });
    return indexed.slice(0, 8).map(x => x.r);
  }, [records]);

  const suggestedGranularity: Granularity = useMemo(() => {
    if (period === 'today' || period === 'week') return 'day';
    if (period === 'month' || period === 'quarter') return 'day';
    return 'month';
  }, [period]);

  return { scoped, kpis, trend, typeData, projectData, partyData, tagData, amountByProject, quality, recentRecords, suggestedGranularity };
}

export default useDashboardStats;
