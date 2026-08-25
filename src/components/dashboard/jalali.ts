export interface JalaliParts {
  jy: number;
  jm: number;
  jd: number;
}

export const J_MONTHS = [
  'فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
  'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند',
];

export const J_SEASONS = ['بهار', 'تابستان', 'پاییز', 'زمستان'];

export function faNum(n: number): string {
  return n.toLocaleString('fa-IR');
}

/** Numbers that must never be grouped (years). */
export function faYear(n: number): string {
  return n.toLocaleString('fa-IR', { useGrouping: false });
}

export function faPct(n: number): string {
  return `${Math.round(n).toLocaleString('fa-IR')}٪`;
}

const jalaliPartsFmt = new Intl.DateTimeFormat('fa-IR-u-ca-persian-nu-latn', {
  year: 'numeric', month: 'numeric', day: 'numeric',
});

export function dateToJalali(d: Date): JalaliParts | null {
  try {
    const parts = jalaliPartsFmt.formatToParts(d);
    const get = (t: string) => Number(parts.find(p => p.type === t)?.value);
    const jy = get('year'), jm = get('month'), jd = get('day');
    if (!jy || !jm || !jd) return null;
    return { jy, jm, jd };
  } catch {
    return null;
  }
}

export function todayJalali(): JalaliParts {
  return dateToJalali(new Date()) ?? { jy: 0, jm: 1, jd: 1 };
}

/** Parses a record's business date. Native format is Jalali "YYYY/MM/DD"; falls back to any parseable date converted via Intl. */
export function parseRecordDate(raw?: string | null): JalaliParts | null {
  if (!raw) return null;
  const s = String(raw).trim();
  const m = s.match(/^(\d{3,4})\/(\d{1,2})\/(\d{1,2})/);
  if (m) {
    const jy = Number(m[1]), jm = Number(m[2]), jd = Number(m[3]);
    if (jm >= 1 && jm <= 12 && jd >= 1 && jd <= 31) return { jy, jm, jd };
    return null;
  }
  const d = new Date(s.includes('T') ? s : s + 'T00:00:00');
  if (isNaN(d.getTime())) return null;
  return dateToJalali(d);
}

export function jalaliKey(p: JalaliParts): string {
  return `${p.jy}/${String(p.jm).padStart(2, '0')}/${String(p.jd).padStart(2, '0')}`;
}

function daysInJalaliMonth(jy: number, jm: number): number {
  if (jm <= 6) return 31;
  if (jm <= 11) return 30;
  return (isJalaliLeap(jy) ? 30 : 29);
}

function isJalaliLeap(jy: number): boolean {
  const r = jy % 33;
  return [1, 5, 9, 13, 17, 22, 26, 30].includes(r);
}

/** Advances a Jalali date by n days using month lengths. */
export function addJalaliDays(p: JalaliParts, n: number): JalaliParts {
  let { jy, jm, jd } = p;
  jd += n;
  while (jd > daysInJalaliMonth(jy, jm)) {
    jd -= daysInJalaliMonth(jy, jm);
    jm += 1;
    if (jm > 12) { jm = 1; jy += 1; }
  }
  while (jd < 1) {
    jm -= 1;
    if (jm < 1) { jm = 12; jy -= 1; }
    jd += daysInJalaliMonth(jy, jm);
  }
  return { jy, jm, jd };
}

export function addJalaliMonths(p: JalaliParts, n: number): JalaliParts {
  const total = p.jy * 12 + (p.jm - 1) + n;
  return { jy: Math.floor(total / 12), jm: (total % 12) + 1, jd: p.jd };
}

export function jalaliMonthLabel(p: Pick<JalaliParts, 'jy' | 'jm'>): string {
  return `${J_MONTHS[p.jm - 1]} ${faYear(p.jy)}`;
}

export function jalaliDayLabel(p: JalaliParts): string {
  return `${faNum(p.jd)} ${J_MONTHS[p.jm - 1]}`;
}

export function jalaliSeasonLabel(p: Pick<JalaliParts, 'jy' | 'jm'>): string {
  return `${J_SEASONS[Math.floor((p.jm - 1) / 3)]} ${faYear(p.jy)}`;
}

/** Inclusive list of Jalali month starts between two keys; capped to avoid pathological ranges. */
export function jalaliMonthRange(from: JalaliParts, to: JalaliParts, cap = 36): JalaliParts[] | null {
  const start = { jy: from.jy, jm: from.jm, jd: 1 };
  const months = (to.jy * 12 + to.jm) - (from.jy * 12 + from.jm) + 1;
  if (months <= 0 || months > cap) return null;
  const out: JalaliParts[] = [];
  for (let i = 0; i < months; i++) out.push(addJalaliMonths(start, i));
  return out;
}

/** Inclusive list of Jalali days between two keys; capped. */
export function jalaliDayRange(from: JalaliParts, to: JalaliParts, cap = 120): JalaliParts[] | null {
  const startKey = jalaliKey(from), endKey = jalaliKey(to);
  if (startKey > endKey) return null;
  const approxDays = Math.round((new Date(to.jy, to.jm, to.jd).getTime() - new Date(from.jy, from.jm, from.jd).getTime()) / 86400000);
  if (approxDays > cap) return null;
  const out: JalaliParts[] = [];
  let cur = from;
  let guard = 0;
  while (jalaliKey(cur) <= endKey && guard++ <= cap + 10) {
    out.push(cur);
    cur = addJalaliDays(cur, 1);
  }
  return out.length > 0 ? out : null;
}
