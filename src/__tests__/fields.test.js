import { describe, it, expect } from 'vitest';
import { FIELDS, EMPTY_FORM, CSV_TEMPLATE, PAGE_SIZE } from '../data/fields';

describe('fields data', () => {
  it('has correct number of fields', () => {
    expect(FIELDS).toHaveLength(7);
  });

  it('each field has required keys', () => {
    FIELDS.forEach(f => {
      expect(f).toHaveProperty('key');
      expect(f).toHaveProperty('label');
      expect(f).toHaveProperty('fa');
    });
  });

  it('EMPTY_FORM has all field keys', () => {
    FIELDS.forEach(f => {
      expect(EMPTY_FORM).toHaveProperty(f.key);
    });
  });

  it('related field starts as empty array', () => {
    expect(EMPTY_FORM.related).toEqual([]);
  });

  it('CSV_TEMPLATE contains header row', () => {
    const headers = FIELDS.map(f => f.key).join(',');
    expect(CSV_TEMPLATE).toContain(headers);
  });

  it('PAGE_SIZE is a positive number', () => {
    expect(PAGE_SIZE).toBeGreaterThan(0);
    expect(Number.isInteger(PAGE_SIZE)).toBe(true);
  });
});
