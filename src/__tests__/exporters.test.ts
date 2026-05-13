import { describe, it, expect, vi, beforeEach } from 'vitest';
import { downloadCSV, TEMPLATES } from '../utils/exporters';
import { FIELDS } from '../data/fields';

describe('exporters', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('downloadCSV creates valid CSV content', () => {
    const createObjectURL = vi.fn(() => 'blob:test');
    globalThis.URL.createObjectURL = createObjectURL;
    const click = vi.fn();
    const a = { href: '', click, download: '' };
    vi.spyOn(document, 'createElement').mockReturnValue(a);

    const records = [
      { code: 'INV-001', project: 'Test', type: 'Invoice', date: '1403/01/01', party: 'Co', amount: '1000', related: [] },
    ];

    downloadCSV(records, FIELDS);
    expect(document.createElement).toHaveBeenCalledWith('a');
    expect(a.download).toBe('labels_export.csv');
    expect(a.click).toHaveBeenCalled();
  });

  it('TEMPLATES has all three templates', () => {
    expect(TEMPLATES).toHaveProperty('classic');
    expect(TEMPLATES).toHaveProperty('compact');
    expect(TEMPLATES).toHaveProperty('detailed');
  });

  it('classic template generates HTML', () => {
    const html = TEMPLATES.classic.getLabelHtml(
      { code: 'TEST-001', project: 'Test', type: 'Invoice', date: '1403/01/01', party: 'Co', amount: '1000', related: [] },
      FIELDS
    );
    expect(html).toContain('TEST-001');
    expect(html).toContain('Test');
  });

  it('detailed template includes related labels when present', () => {
    const html = TEMPLATES.detailed.getLabelHtml(
      { code: 'TEST-001', project: 'Test', type: 'Invoice', date: '1403/01/01', party: 'Co', amount: '1000', related: ['REL-001'] },
      FIELDS
    );
    expect(html).toContain('REL-001');
  });
});
