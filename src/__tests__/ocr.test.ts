import { describe, it, expect } from 'vitest';
import { extractFields } from '../utils/ocr';

// Regression test (audit F-BUG-01): `patterns` was a list of bare RegExp
// values typed as [RegExp, string] tuples, so destructuring `[regex, key]`
// threw at runtime and no field was ever extracted.
describe('extractFields', () => {
  it('extracts invoice fields with the keys RecordForm consumes', () => {
    const fields = extractFields(
      [
        'Invoice: INV-2041',
        'Date: 1403/05/11',
        'Customer: Acme Trading Co',
        'Project: Warehouse labels',
        'Total: 12,500,000',
      ].join('\n')
    );
    expect(fields.code).toBe('INV-2041');
    expect(fields.date).toContain('1403/05/11');
    expect(fields.party).toBe('Acme Trading Co');
    expect(fields.project).toBe('Warehouse labels');
    expect(fields.amount).toBe('12,500,000');
  });

  it('returns an empty object for blank input instead of throwing', () => {
    expect(extractFields('')).toEqual({});
    expect(extractFields('   \n  ')).toEqual({});
  });
});
