import { useMemo } from 'react';
import Chart from 'react-apexcharts';
import type { ApexOptions } from 'apexcharts';
import { TrendingUp, CalendarRange } from 'lucide-react';
import { useTheme } from '../../hooks/useTheme';
import type { Granularity, TrendPoint } from '../../hooks/useDashboardStats';
import { faNum } from './jalali';
import { DashboardSection, EmptyState } from './DashboardSection';

const GRANULARITIES: Array<{ key: Granularity; label: string }> = [
  { key: 'day', label: 'روزانه' },
  { key: 'month', label: 'ماهانه' },
  { key: 'season', label: 'فصلی' },
];

interface Props {
  points: TrendPoint[];
  peak: TrendPoint | null;
  datedCount: number;
  scopedCount: number;
  granularity: Granularity;
  availableGranularities: Granularity[];
  onGranularityChange: (g: Granularity) => void;
}

export function RecordsTrendChart({
  points,
  peak,
  datedCount,
  scopedCount,
  granularity,
  availableGranularities,
  onGranularityChange,
}: Props) {
  const { isDark, primary } = useTheme();

  const options = useMemo<ApexOptions>(() => ({
    chart: {
      type: 'area',
      toolbar: { show: false },
      zoom: { enabled: false },
      fontFamily: 'inherit',
      foreColor: isDark ? '#a9bdb8' : '#6b7a76',
      animations: { enabled: true, speed: 550 },
      parentHeightOffset: 0,
    },
    colors: [primary],
    stroke: { curve: 'smooth', width: 2.2 },
    fill: {
      type: 'gradient',
      gradient: { shadeIntensity: 0, opacityFrom: 0.22, opacityTo: 0.02, stops: [0, 100] },
    },
    dataLabels: { enabled: false },
    grid: {
      borderColor: isDark ? '#2b3533' : '#e6e1d3',
      strokeDashArray: 3,
      padding: { left: 8, right: 8, top: 0 },
    },
    markers: { size: 0, strokeWidth: 2, hover: { size: 5, sizeOffset: 0 } },
    xaxis: {
      categories: points.map(p => p.label),
      labels: {
        rotate: 0,
        hideOverlappingLabels: true,
        style: { fontSize: '11px' },
        trim: true,
      },
      axisBorder: { show: false },
      axisTicks: { show: false },
      tooltip: { enabled: false },
    },
    yaxis: {
      min: 0,
      forceNiceScale: true,
      labels: {
        formatter: (v: number) => faNum(Math.round(v)),
        style: { fontSize: '11px' },
      },
    },
    tooltip: {
      theme: isDark ? 'dark' : 'light',
      x: {
        formatter: (_val: number, opts) => {
          const i = opts?.dataPointIndex ?? -1;
          return i >= 0 && points[i] ? points[i].full : '';
        },
      },
      y: { formatter: (v: number) => `${faNum(v)} رکورد` },
    },
  }), [points, isDark, primary]);

  const windowTotal = points.reduce((s, p) => s + p.value, 0);
  const shownGranularities = GRANULARITIES.filter(g => availableGranularities.includes(g.key));

  return (
    <DashboardSection
      className="txd-span-8"
      title={<><CalendarRange size={15} /> روند ثبت رکوردها</>}
      action={
        shownGranularities.length > 1 ? (
          <span className="txd-seg" role="tablist" aria-label="بازه نمودار">
            {shownGranularities.map(g => (
              <button
                key={g.key}
                type="button"
                role="tab"
                aria-selected={granularity === g.key}
                className={`txd-seg-btn ${granularity === g.key ? 'active' : ''}`}
                onClick={() => onGranularityChange(g.key)}
              >
                {g.label}
              </button>
            ))}
          </span>
        ) : undefined
      }
    >
      <div className="txd-trend-summary">
        <div className="txd-trend-stat">
          <span className="txd-trend-stat-label">رکوردهای دارای تاریخ</span>
          <span className="txd-trend-stat-value">{faNum(datedCount)}</span>
        </div>
        {peak ? (
          <div className="txd-trend-stat">
            <span className="txd-trend-stat-label">بیشترین ثبت</span>
            <span className="txd-trend-stat-value">{peak.full}</span>
          </div>
        ) : null}
        {scopedCount !== datedCount ? (
          <div className="txd-trend-stat">
            <span className="txd-trend-stat-label">بدون تاریخ معتبر</span>
            <span className="txd-trend-stat-value">{faNum(scopedCount - datedCount)}</span>
          </div>
        ) : null}
      </div>

      {points.length === 0 || windowTotal === 0 ? (
        <EmptyState
          icon={<TrendingUp size={20} />}
          title="داده‌ای برای نمایش روند وجود ندارد"
          hint="برای دیدن روند، بازه زمانی دیگری را انتخاب کنید یا به رکوردها تاریخ معتبر اضافه کنید."
        />
      ) : (
        <div className="txd-chart-dir">
          <Chart options={options} series={[{ name: 'رکورد', data: points.map(p => p.value) }]} type="area" height={252} />
        </div>
      )}
    </DashboardSection>
  );
}
