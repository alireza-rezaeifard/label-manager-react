import { CHART_COLORS } from '../charts/charts';

/** Stable series color for a name — same name always maps to the same Ink Ledger chart color. */
export function stableColor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return CHART_COLORS[h % CHART_COLORS.length];
}
