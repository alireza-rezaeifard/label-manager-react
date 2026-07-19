import type { RecordItem } from '../types';

export const toJalaliDate = (date: string | number | Date | null | undefined) => {
  if (!date) return "";
  const d = new Date(date);
  const persianDate = d.toLocaleDateString('fa-IR', {
    year: 'numeric', month: '2-digit', day: '2-digit', calendar: 'persian',
  });
  return persianDate.replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)));
};

export const formatAmount = (value: unknown): string => {
  if (value === null || value === undefined || value === '') return '';
  const normalized = String(value).replace(/[۰-۹]/g, d => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)));
  const num = normalized.replace(/[^0-9]/g, '');
  if (!num) return String(value);
  return Number(num).toLocaleString('en-US');
};

export const getTotalAmount = (records: RecordItem[]) => {
  let total = 0;
  for (const r of records) {
    const normalized = String(r.amount || '').replace(/[۰-۹]/g, d => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)));
    const num = normalized.replace(/[^0-9]/g, '');
    if (num) total += Number(num);
  }
  return total.toLocaleString('fa-IR');
};

export function parseCode(code: string): { projectNum: number | null; type: string; year: string; sequence: number } | null {
  const projMatch = code.match(/^PROJ(\d+)-([A-Za-z]+)-(\d{4})-(\d+)$/);
  if (projMatch) {
    return {
      projectNum: parseInt(projMatch[1], 10),
      type: projMatch[2],
      year: projMatch[3],
      sequence: parseInt(projMatch[4], 10),
    };
  }
  const simpleMatch = code.match(/^([A-Za-z]+)-(\d{4})-(\d+)$/);
  if (simpleMatch) {
    return {
      projectNum: null,
      type: simpleMatch[1],
      year: simpleMatch[2],
      sequence: parseInt(simpleMatch[3], 10),
    };
  }
  return null;
}

export function formatCode(projectNum: number | null, type: string, year: string, sequence: number): string {
  const seq = String(sequence).padStart(3, '0');
  if (projectNum !== null) {
    const proj = String(projectNum).padStart(3, '0');
    return `PROJ${proj}-${type}-${year}-${seq}`;
  }
  return `${type}-${year}-${seq}`;
}
