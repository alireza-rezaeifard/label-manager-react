/**
 * PersianLabs/ui-style `persian-date` utility.
 * Formats Gregorian JS Date values in the Jalali (Iranian) calendar.
 * Uses the platform's ICU-based `Intl` support for correct Jalali conversion,
 * so no extra dependency is needed.
 *
 * @example
 *   toPersianDate(new Date())          // "۱۴۰۳/۰۲/۱۰"
 *   toPersianDateTime(new Date())      // "۱۴۰۳/۰۲/۱۰ ۱۴:۳۰"
 *   formatPersianDigits(2024)          // "۲۰۲۴" (persian numerals)
 */

const FA_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
const AR_DIGITS = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];

export function toFaDigits(input: string | number): string {
  return String(input).replace(/[0-9]/g, (d) => FA_DIGITS[Number(d)]);
}

export function toEnDigits(input: string): string {
  return String(input)
    .replace(/[۰-۹]/g, (d) => String(FA_DIGITS.indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String(AR_DIGITS.indexOf(d)));
}

const PERSIAN_DATE_FMT = new Intl.DateTimeFormat('fa-IR-u-ca-persian', { year: 'numeric', month: '2-digit', day: '2-digit' });
const PERSIAN_DATETIME_FMT = new Intl.DateTimeFormat('fa-IR-u-ca-persian', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });

function toDate(input: Date | string | number): Date | null {
  const d = input instanceof Date ? input : new Date(input);
  return isNaN(d.getTime()) ? null : d;
}

/** Convert a JS Date (or ISO string / timestamp) to a Persian date string. Returns "" for invalid input. */
export function toPersianDate(input: Date | string | number): string {
  const d = toDate(input);
  if (!d) return '';
  return PERSIAN_DATE_FMT.format(d).replace(/\u200F/g, '');
}

/** Convert a JS Date (or ISO string / timestamp) to a Persian date + time string. */
export function toPersianDateTime(input: Date | string | number): string {
  const d = toDate(input);
  if (!d) return '';
  return PERSIAN_DATETIME_FMT.format(d).replace(/\u200F/g, '');
}

export default toPersianDate;
