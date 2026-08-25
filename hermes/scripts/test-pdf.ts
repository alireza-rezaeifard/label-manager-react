/* Dev-only: generate a sample Persian report PDF to verify shaping/RTL. */
import { renderReportPdf } from '../src/report/pdf.js';
import { jalaliMonthRange, toJalaliString } from '../src/report/jalali.js';
import fs from 'fs';

const now = new Date();
const range = jalaliMonthRange(0, now);

const data = {
  title: `گزارش تغییرات ${range.label}`,
  workspaceName: 'TaxBook',
  period: { start: range.start, end: range.end, jy: range.jy, jm: range.jm },
  summary: { created: 124, updated: 87, deleted: 12, restored: 3 },
  activities: [
    { user: 'admin', action: 'create', details: 'Created record PROJ000-EXP-1405-001', created_at: `${range.start} 10:30:00` },
    { user: 'sara', action: 'update', details: 'Updated record HR-1405-006', created_at: `${range.start} 12:45:00` },
    { user: 'admin', action: 'delete', details: 'Deleted record PROJ000-PAY-1405-003', created_at: `${range.end} 09:00:00` },
  ],
  projects: [
    { name: 'PROJ000', count: 383, totalAmount: 12345678901 },
    { name: 'HR', count: 42, totalAmount: 987654321 },
  ],
  generatedAt: now.toISOString(),
};

const buffer = await renderReportPdf(data);
fs.writeFileSync('test-report.pdf', buffer);
console.log('PDF written:', buffer.length, 'bytes');
console.log('Period:', range.label, toJalaliString(range.start), 'to', toJalaliString(range.end));
