/**
 * PersianLabs/ui-style `persian-date-zod` utility.
 * Structural validation of a Jalali (Persian) date string.
 * Lightweight — no `zod` dependency required by the app. Mirrors the
 * zod `.safeParse()` / `.parse()` API shape.
 */

import { toEnDigits } from './persianDate';

export interface PersianDateCheck { ok: boolean; error?: string; data?: string }

function digitLength(s: string) {
  // allow YYYY/MM/DD with separators; count significant digits
  const n = toEnDigits(s).replace(/[^0-9]/g, '');
  return n.length >= 6;
}
function rangesOk(s: string): boolean {
  const n = toEnDigits(s);
  const m = /(\d{4})\s*[/\\\-.\s]\s*(\d{1,2})\s*[/\\\-.\s]\s*(\d{1,2})/.exec(n);
  if (!m) return false;
  const month = Number(m[2]);
  const day = Number(m[3]);
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;
  if ((month <= 6 && day > 31) || (month > 6 && day > 30)) return false;
  if (month === 12 && day > (29 + (Number(m[1]) % 4 === 0 ? 1 : 0))) return false;
  return true;
}

export function isPersianDate(value: string): boolean {
  return /^[0-9۰-۹٠-٩]+[\s/\\\-.]+[0-9۰-۹٠-٩]+[\s/\\\-.]+[0-9۰-۹٠-٩]+$/.test(value.trim()) && digitLength(value) && rangesOk(value);
}

export function safePersianDate(value: string): PersianDateCheck {
  const t = value.trim();
  if (!t) return { ok: false, error: 'تاریخ وارد نشده است' };
  if (!isPersianDate(t)) return { ok: false, error: 'تاریخ شمسی معتبر نیست (مثال: ۱۴۰۳/۰۲/۱۰)' };
  return { ok: true, data: t };
}

export const persianDateSchema = {
  safeParse: (value: unknown): PersianDateCheck =>
    typeof value === 'string' ? safePersianDate(value) : { ok: false, error: 'تاریخ باید رشته باشد' },
  parse: (value: unknown): string => {
    const r = persianDateSchema.safeParse(value);
    if (!r.ok) throw new Error(r.error || 'Invalid persian date');
    return r.data as string;
  },
};

export default persianDateSchema;
