import type { ReactNode } from 'react';
import { faNum } from './jalali';
import { useCountUp } from './useCountUp';

export interface MetricCardProps {
  folio: string;
  label: string;
  value: number;
  hint?: ReactNode;
  glyph?: ReactNode;
  delta?: number | null;
  sparkline?: number[];
  className?: string;
}

function Sparkline({ points }: { points: number[] }) {
  const w = 64;
  const h = 22;
  const max = Math.max(...points, 1);
  const step = points.length > 1 ? w / (points.length - 1) : w;
  const d = points
    .map((v, i) => `${i === 0 ? 'M' : 'L'}${(i * step).toFixed(1)},${(h - (v / max) * (h - 3) - 1.5).toFixed(1)}`)
    .join(' ');
  return (
    <svg className="txd-spark" width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden="true">
      <path d={d} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function MetricCard({
  folio,
  label,
  value,
  hint,
  glyph,
  delta,
  sparkline,
  className = '',
}: MetricCardProps) {
  const shown = useCountUp(value);
  return (
    <div className={`txd-metric ${className}`}>
      <span className="txd-metric-top">
        {glyph ? <span className="txd-metric-glyph">{glyph}</span> : null}
        <span className="txd-metric-label">{label}</span>
        <span className="txd-metric-folio" aria-hidden="true">{folio}</span>
      </span>
      <span className="txd-metric-value">{faNum(shown)}</span>
      <span className="txd-metric-foot">
        <span
          className={`txd-metric-hint ${
            delta !== null && delta !== undefined ? (delta >= 0 ? 'txd-delta-up' : 'txd-delta-down') : ''
          }`}
        >
          {delta !== null && delta !== undefined
            ? delta >= 0
              ? `▲ ${faNum(delta)}٪ نسبت به هفته قبل`
              : `▼ ${faNum(Math.abs(delta))}٪ نسبت به هفته قبل`
            : hint}
        </span>
        {sparkline ? <Sparkline points={sparkline} /> : null}
      </span>
    </div>
  );
}
