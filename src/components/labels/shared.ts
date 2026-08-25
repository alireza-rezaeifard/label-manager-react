import type { CustomField } from '../../types';

export const faNum = (n: number): string => n.toLocaleString('fa-IR');

export function relativeTime(value?: string): string {
  if (!value) return '';
  const d = new Date(value.includes('T') ? value : value + 'T00:00:00Z');
  if (isNaN(d.getTime())) return value;
  const diff = Date.now() - d.getTime();
  if (diff < 0) return 'اکنون';
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'اکنون';
  if (mins < 60) return `${faNum(mins)} دقیقه پیش`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${faNum(hrs)} ساعت پیش`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${faNum(days)} روز پیش`;
  const weeks = Math.floor(days / 7);
  if (weeks < 4) return `${faNum(weeks)} هفته پیش`;
  return d.toLocaleDateString('fa-IR');
}

export function formatStampDate(value?: string): string {
  if (!value) return '';
  try {
    const d = new Date(value);
    if (isNaN(d.getTime())) return value;
    return d.toLocaleDateString('fa-IR');
  } catch {
    return value;
  }
}

export function enabledFields(customFields: CustomField[], enabledKeys: string[]): CustomField[] {
  if (!customFields.length || !enabledKeys.length) return [];
  const set = new Set(enabledKeys);
  return customFields.filter(f => set.has(f.key));
}
