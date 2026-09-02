/**
 * Persian text normalization (audit #34 / F5).
 *
 * Single consolidated module for normalizing Persian/Arabic text so that
 * search, deduplication and validation behave consistently regardless of
 * whether the user (or an import file) typed Arabic or Persian codepoints,
 * Arabic or Persian digits, zero-width characters, or different half-space
 * variants.
 *
 * Canonical (database) values are never modified by these helpers — they are
 * for comparison/search/display-boundary use only.
 */

const AR_DIGITS = '٠١٢٣٤٥٦٧٨٩';
const FA_DIGITS = '۰۱۲۳۴۵۶۷۸۹';

/** Arabic (٠-٩) and Persian (۰-۹) digits → ASCII 0-9. */
export function normalizeDigits(input: string): string {
  return String(input)
    .replace(/[٠-٩]/g, (d) => String(AR_DIGITS.indexOf(d)))
    .replace(/[۰-۹]/g, (d) => String(FA_DIGITS.indexOf(d)));
}

/** Arabic characters that share codepoints' Persian equivalents → Persian. */
export function unifyPersianChars(input: string): string {
  return String(input)
    .replace(/ي|ئ/g, 'ی') // Arabic yeh & yeh-with-hamza → Persian yeh
    .replace(/ك/g, 'ک') // Arabic kaf → Persian keheh
    .replace(/ؤ/g, 'و')
    .replace(/إ|أ|آ|ٱ/g, 'ا')
    .replace(/ة/g, 'ه');
}

/**
 * Normalize a Persian string for search/compare:
 * - strips zero-width and direction-mark characters (U+200B–200F, U+FEFF)
 * - unifies Arabic yeh/kaf/etc. to Persian equivalents
 * - unifies all digits to ASCII
 * - collapses all whitespace runs (incl. ZWNJ half-space variants) to a single space
 * - trims and lowercases latin characters
 */
export function normalizeForSearch(input: string): string {
  return unifyPersianChars(
    String(input)
      .replace(/[\u200b\u200d-\u200f\uFEFF]/g, '') // zero-width & direction marks (ZWNJ handled next)
      .replace(/\u200c/g, ' ') // ZWNJ (half-space) → plain space
  )
    .replace(/[٠-٩۰-۹]/g, (d) => {
      const ar = AR_DIGITS.indexOf(d);
      if (ar >= 0) return String(ar);
      return String(FA_DIGITS.indexOf(d));
    })
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/** ASCII digits → Persian digits (display boundary only; never for stored values). */
export function toPersianDigits(input: string | number): string {
  return String(input).replace(/[0-9]/g, (d) => FA_DIGITS[Number(d)]);
}
