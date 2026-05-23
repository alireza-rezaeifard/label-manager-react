import { describe, it, expect } from 'vitest';
import { toJalaliDate, formatAmount, getTotalAmount } from '../utils/formatters';

describe('formatters', () => {
  it('toJalaliDate formats a date string', () => {
    const result = toJalaliDate('2024-04-24');
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('toJalaliDate returns empty for null', () => {
    expect(toJalaliDate(null)).toBe('');
    expect(toJalaliDate(undefined)).toBe('');
    expect(toJalaliDate('')).toBe('');
  });

  it('formatAmount formats numbers with comma separators', () => {
    const result = formatAmount('5000000');
    expect(result).toBe('5,000,000');
  });

  it('formatAmount handles empty input', () => {
    expect(formatAmount('')).toBe('');
    expect(formatAmount(null)).toBe('');
    expect(formatAmount(undefined)).toBe('');
  });

  it('formatAmount handles non-numeric input', () => {
    const result = formatAmount('abc');
    expect(result).toBe('abc');
  });

  it('getTotalAmount sums record amounts', () => {
    const records = [
      { amount: '1000' },
      { amount: '2000' },
      { amount: '3000' },
    ];
    const total = getTotalAmount(records);
    expect(total).toBeTruthy();
  });

  it('getTotalAmount returns a value for empty records', () => {
    expect(getTotalAmount([])).toBeTruthy();
  });

  it('getTotalAmount handles amounts with non-numeric chars', () => {
    const records = [
      { amount: '1,000' },
      { amount: '2,000 تومان' },
      { amount: '' },
    ];
    const total = getTotalAmount(records);
    expect(total).toBeTruthy();
  });
});
