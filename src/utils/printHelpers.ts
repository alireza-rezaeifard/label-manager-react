export function estimatePaperCount(recordCount: number, cols: number = 3): number {
  if (recordCount <= 0) return 0;
  return Math.ceil(recordCount / cols);
}

export function estimatePaperLabel(count: string): string {
  return `${count} برگ کاغذ (${count} صفحه A4)`;
}
