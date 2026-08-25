/* Jalali (Solar Hijri) ↔ Gregorian conversion — jalaali-js algorithm (public domain),
   reduced to what report generation needs. */

export interface JalaliDate {
  jy: number;
  jm: number;
  jd: number;
}

function div(a: number, b: number): number {
  return Math.trunc(a / b);
}

function jalCal(jy: number): { leap: number; gy: number; march: number } {
  const breaks = [-61, 9, 38, 199, 426, 686, 756, 818, 1111, 1181, 1210, 1635, 1701, 1749, 1770, 1789, 1938, 1971, 2018, 2066];
  let leapJ = -14;
  let jp = breaks[0];
  let jump = 0;
  for (let i = 1; i < breaks.length; i++) {
    const jm = breaks[i];
    jump = jm - jp;
    if (jy < jm) break;
    leapJ = leapJ + div(jump, 33) * 8 + div(jump % 33, 4);
    jp = jm;
  }
  let n = jy - jp;
  leapJ = leapJ + div(n, 33) * 8 + div((n % 33) + 3, 4);
  if (jump % 33 === 4 && jump - n === 4) leapJ += 1;
  const leapG = div(jy + 621, 4) - div(jy + 621, 100) + div(jy + 621, 400) - 150;
  const march = 20 + leapJ - leapG;
  if (jump - n < 6) n = n - jump + div(jump + 4, 33) * 33;
  let leap = (((n + 1) % 33) - 1) % 4;
  if (leap === -1) leap = 4;
  return { leap, gy: jy + 621, march };
}

export function g2d(gy: number, gm: number, gd: number): number {
  let d = div((gy + div(gm - 8, 6) + 100100) * 1461, 4)
    + div(153 * ((gm + 9) % 12) + 2, 5)
    + gd - 34840408;
  d = d - div(div(gy + 100100 + div(gm - 8, 6), 100) * 3, 4) + 752;
  return d;
}

export function d2g(jdn: number): { gy: number; gm: number; gd: number } {
  let j = 4 * jdn + 139361631;
  j = j + div(div(4 * jdn + 183187720, 146097) * 3, 4) * 4 - 3908;
  const i = div((j % 1461) / 4, 1) * 5 + 308;
  const gd = div((i % 153) / 5, 1) + 1;
  const gm = (div(i, 153) % 12) + 1;
  const gy = div(j, 1461) - 100100 + div(8 - gm, 6);
  return { gy, gm, gd };
}

export function j2d(jy: number, jm: number, jd: number): number {
  const r = jalCal(jy);
  return g2d(r.gy, 3, r.march) + (jm - 1) * 31 - div(jm, 7) * (jm - 7) + jd - 1;
}

export function d2j(jdn: number): JalaliDate {
  const gy = d2g(jdn).gy;
  let jy = gy - 621;
  const r = jalCal(jy);
  const jdn1f = g2d(gy, 3, r.march);
  let k = jdn - jdn1f;
  if (k >= 0) {
    if (k <= 185) {
      const jm = 1 + div(k, 31);
      const jd = (k % 31) + 1;
      return { jy, jm, jd };
    } else {
      k -= 186;
    }
  } else {
    jy -= 1;
    k += 179;
    if (r.leap === 1) k += 1;
  }
  const jm = 7 + div(k, 30);
  const jd = (k % 30) + 1;
  return { jy, jm, jd };
}

export function jalaliMonthLength(jy: number, jm: number): number {
  if (jm <= 6) return 31;
  if (jm <= 11) return 30;
  return jalCal(jy).leap === 1 ? 30 : 29;
}

export const JALALI_MONTHS = [
  'فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
  'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند',
];

/** Convert a JS Date to its Jalali components (in local time). */
export function dateToJalali(date: Date): JalaliDate {
  const jdn = g2d(date.getFullYear(), date.getMonth() + 1, date.getDate());
  return d2j(jdn);
}

/**
 * Resolve the Gregorian [start, end] (inclusive, ISO date strings) of a
 * Jalali month. monthOffset 0 = current Jalali month, -1 = previous, …
 */
export function jalaliMonthRange(monthOffset: number, now = new Date()): {
  start: string; end: string; jy: number; jm: number; label: string;
} {
  const todayJ = dateToJalali(now);
  let index = todayJ.jy * 12 + (todayJ.jm - 1) + monthOffset;
  const jy = div(index, 12);
  const jm = (index % 12) + 1;
  const startJdn = j2d(jy, jm, 1);
  const endJdn = j2d(jy, jm, jalaliMonthLength(jy, jm));
  const startG = d2g(startJdn);
  const endG = d2g(endJdn);
  const iso = (g: { gy: number; gm: number; gd: number }) =>
    `${g.gy}-${String(g.gm).padStart(2, '0')}-${String(g.gd).padStart(2, '0')}`;
  return {
    start: iso(startG),
    end: iso(endG),
    jy,
    jm,
    label: `${JALALI_MONTHS[jm - 1]} ${jy.toLocaleString('fa-IR', { useGrouping: false })}`,
  };
}

/** Format a Gregorian date as Jalali, e.g. ۱۴۰۵/۰۵/۰۱ */
export function toJalaliString(isoDate: string): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  const j = d2j(g2d(y, m, d));
  const fa = (n: number) => n.toLocaleString('fa-IR', { useGrouping: false }).padStart(2, '۰');
  return `${fa(j.jy)}/${fa(j.jm)}/${fa(j.jd)}`;
}
