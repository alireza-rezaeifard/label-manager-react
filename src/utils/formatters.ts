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
  return Number(num).toLocaleString('fa-IR');
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
