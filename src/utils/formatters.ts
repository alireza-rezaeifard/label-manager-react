export const toJalaliDate = (date) => {
  if (!date) return "";
  const d = new Date(date);
  const persianDate = d.toLocaleDateString('fa-IR', {
    year: 'numeric', month: '2-digit', day: '2-digit', calendar: 'persian',
  });
  return persianDate.replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)));
};

export const formatAmount = (value) => {
  if (value === null || value === undefined || value === '') return '';
  const normalized = String(value).replace(/[۰-۹]/g, d => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)));
  const num = normalized.replace(/[^0-9]/g, '');
  if (!num) return value;
  return Number(num).toLocaleString('en-US');
};

export const getTotalAmount = (records) => {
  let total = 0;
  for (const r of records) {
    const normalized = String(r.amount || '').replace(/[۰-۹]/g, d => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)));
    const num = normalized.replace(/[^0-9]/g, '');
    if (num) total += Number(num);
  }
  return total.toLocaleString('fa-IR');
};

export function parseCode(code: string): { projectNum: number; type: string; year: string; sequence: number } | null {
  const match = code.match(/^PROJ(\d+)-([A-Za-z]+)-(\d{4})-(\d+)$/);
  if (!match) return null;
  return {
    projectNum: parseInt(match[1], 10),
    type: match[2],
    year: match[3],
    sequence: parseInt(match[4], 10),
  };
}

export function formatCode(projectNum: number, type: string, year: string, sequence: number): string {
  const proj = String(projectNum).padStart(3, '0');
  const seq = String(sequence).padStart(3, '0');
  return `PROJ${proj}-${type}-${year}-${seq}`;
}
