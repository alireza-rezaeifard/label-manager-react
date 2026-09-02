import { describe, it, expect } from 'vitest';
import {
  normalizeDigits,
  unifyPersianChars,
  normalizeForSearch,
  toPersianDigits,
} from '../utils/persianNormalize';

describe('normalizeDigits', () => {
  it('converts Persian digits to ASCII', () => {
    expect(normalizeDigits('۱۲۳۴۵')).toBe('12345');
  });

  it('converts Arabic digits to ASCII', () => {
    expect(normalizeDigits('١٢٣٤٥')).toBe('12345');
  });

  it('leaves ASCII digits untouched', () => {
    expect(normalizeDigits('123abc')).toBe('123abc');
  });
});

describe('unifyPersianChars', () => {
  it('maps Arabic yeh and kaf to Persian equivalents', () => {
    expect(unifyPersianChars('علي')).toBe('علی');
    expect(unifyPersianChars('كتاب')).toBe('کتاب');
  });

  it('maps alef variants to plain alef', () => {
    expect(unifyPersianChars('أحمد إبراهيم آفتاب')).toBe('احمد ابراهیم افتاب');
  });
});

describe('normalizeForSearch', () => {
  it('makes Arabic-typed and Persian-typed text equivalent', () => {
    expect(normalizeForSearch('علي')).toBe(normalizeForSearch('علی'));
    expect(normalizeForSearch('كتاب')).toBe(normalizeForSearch('کتاب'));
  });

  it('strips zero-width characters (ZWNJ becomes a space)', () => {
    expect(normalizeForSearch('ت\u200bس\u200cت')).toBe(normalizeForSearch('تس ت'));
  });

  it('unifies mixed digit systems', () => {
    expect(normalizeForSearch('فاکتور ۱۲۳')).toBe(normalizeForSearch('فاکتور 123'));
    expect(normalizeForSearch('٣٤')).toBe('34');
  });

  it('collapses whitespace and lowercases latin text', () => {
    expect(normalizeForSearch('  INV-001   ProJect ')).toBe('inv-001 project');
  });

  it('demonstrates the search use-case end to end', () => {
    // User searches with Arabic digits & yeh; stored record uses Persian forms.
    const stored = 'علی رضایی فاکتور ۱۲۳';
    const query = 'علي رضائي فاکتور ١٢٣';
    expect(normalizeForSearch(stored).includes(normalizeForSearch(query))).toBe(true);
  });
});

describe('toPersianDigits', () => {
  it('converts ASCII digits for display', () => {
    expect(toPersianDigits(123456789)).toBe('۱۲۳۴۵۶۷۸۹');
    expect(toPersianDigits('INV-001')).toBe('INV-۰۰۱');
  });
});
