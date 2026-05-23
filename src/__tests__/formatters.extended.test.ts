import { describe, it, expect } from 'vitest';
import { toJalaliDate, formatAmount, getTotalAmount } from '../utils/formatters';

describe('formatters (extended)', () => {
  describe('toJalaliDate', () => {
    it('returns Persian date string for valid ISO date', () => {
      const result = toJalaliDate('2024-03-20');
      expect(result).toBeTruthy();
      expect(typeof result).toBe('string');
    });

    it('handles Date objects', () => {
      const result = toJalaliDate(new Date('2024-03-20'));
      expect(result).toBeTruthy();
    });

    it('returns empty string for falsy inputs', () => {
      expect(toJalaliDate(null)).toBe('');
      expect(toJalaliDate(undefined)).toBe('');
      expect(toJalaliDate('')).toBe('');
      expect(toJalaliDate(false)).toBe('');
    });
  });

  describe('formatAmount', () => {
    it('formats plain number strings', () => {
      const result = formatAmount('5000000');
      expect(result).toBe('5,000,000');
    });

    it('handles empty/null/undefined', () => {
      expect(formatAmount('')).toBe('');
      expect(formatAmount(null)).toBe('');
      expect(formatAmount(undefined)).toBe('');
    });

    it('returns original string for non-numeric', () => {
      expect(formatAmount('abc')).toBe('abc');
      expect(formatAmount('N/A')).toBe('N/A');
    });

    it('handles already-formatted numbers', () => {
      const result = formatAmount('5,000,000');
      expect(result).toBeTruthy();
    });
  });

  describe('getTotalAmount', () => {
    const persianToNumber = (s) => {
      const persianDigits = '۰۱۲۳۴۵۶۷۸۹';
      const western = String(s).replace(/[۰-۹]/g, d => String(persianDigits.indexOf(d)));
      return parseInt(western.replace(/[^0-9]/g, ''), 10);
    };

    it('sums multiple record amounts', () => {
      const records = [
        { amount: '1000' },
        { amount: '2000' },
        { amount: '3000' },
      ];
      const total = getTotalAmount(records);
      expect(persianToNumber(total)).toBe(6000);
    });

    it('returns a value for empty records', () => {
      const total = getTotalAmount([]);
      expect(total).toBeTruthy();
    });

    it('handles mixed formats including commas and text', () => {
      const records = [
        { amount: '1,000' },
        { amount: '2,000 تومان' },
        { amount: '' },
        { amount: '500' },
      ];
      const total = getTotalAmount(records);
      expect(persianToNumber(total)).toBe(3500);
    });

    it('handles records with missing amount field', () => {
      const records = [
        { amount: '1000' },
        {},
        { amount: null },
        { amount: undefined },
      ];
      const total = getTotalAmount(records);
      expect(persianToNumber(total)).toBe(1000);
    });
  });
});
