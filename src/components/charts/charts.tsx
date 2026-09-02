"use client"

import Chart from "react-apexcharts"
import { useTheme } from "@/hooks/useTheme"
import type { ApexOptions } from "apexcharts"
import { CHART_COLORS } from "./chartColors"

export { CHART_COLORS } from "./chartColors"

function baseTheme(primary: string, isDark: boolean): ApexOptions {
  return {
    chart: { foreColor: isDark ? "#e4ece9" : "#24302d", fontFamily: "inherit", toolbar: { show: false }, zoom: { enabled: false } },
    colors: CHART_COLORS,
    legend: { labels: { colors: isDark ? "#e4ece9" : "#24302d" } },
    stroke: { width: 2 },
  }
}

export interface ChartDataPoint {
  name: string
  value: number
  color?: string
}

/** Bklit‑style `area-chart` mapped onto ApexCharts. */
export function AreaChart({
  series,
  categories,
  height = 260,
}: {
  series: { name: string; data: number[] }[]
  categories: string[]
  height?: number
}) {
  const { isDark, primary } = useTheme()
  const options: ApexOptions = {
    ...baseTheme(primary, isDark),
    xaxis: { categories, labels: { rotate: -45, style: { fontSize: "11px" } } },
    fill: { type: "gradient", gradient: { opacityFrom: 0.35, opacityTo: 0.05 } },
    dataLabels: { enabled: false },
  }
  return <Chart options={options} series={series} type="area" height={height} />
}

/** Bklit‑style `bar-chart` mapped onto ApexCharts. */
export function BarChart({
  series,
  categories,
  height = 260,
}: {
  series: { name: string; data: number[] }[]
  categories: string[]
  height?: number
}) {
  const { isDark, primary } = useTheme()
  const options: ApexOptions = {
    ...baseTheme(primary, isDark),
    xaxis: { categories, labels: { rotate: -45, style: { fontSize: "11px" } } },
    plotOptions: { bar: { borderRadius: 4, columnWidth: "55%", distributed: series.length === 1 } },
    dataLabels: { enabled: false },
  }
  return <Chart options={options} series={series} type="bar" height={height} />
}

/** Bklit‑style `pie-chart` mapped onto ApexCharts. */
export function PieChart({
  data,
  height = 260,
}: {
  data: ChartDataPoint[]
  height?: number
}) {
  const { isDark, primary } = useTheme()
  const labels = data.map((d) => d.name)
  const values = data.map((d) => d.value)
  const colors = data.map((d, i) => d.color ?? CHART_COLORS[i % CHART_COLORS.length])
  const options: ApexOptions = {
    ...baseTheme(primary, isDark),
    labels,
    colors,
    legend: { position: "bottom" },
    dataLabels: { enabled: false },
    responsive: [{ breakpoint: 480, options: { chart: { width: 200 } } }],
  }
  return <Chart options={options} series={values} type="pie" height={height} />
}

/** Bklit‑style `gauge-chart` mapped onto ApexCharts radialBar. */
export function GaugeChart({
  value,
  label = "",
  color = "#0f766e",
  height = 260,
  min = 0,
  max = 100,
}: {
  value: number
  label?: string
  color?: string
  height?: number
  min?: number
  max?: number
}) {
  const { isDark } = useTheme()
  const options: ApexOptions = {
    chart: { type: "radialBar", foreColor: isDark ? "#e4ece9" : "#24302d", fontFamily: "inherit" },
    colors: [color],
    plotOptions: {
      radialBar: {
        hollow: { size: "60%" },
        dataLabels: { name: { show: !!label, fontSize: "13px" }, value: { fontSize: "24px", formatter: () => String(value) } },
      },
    },
    labels: [label || "Gauge"],
  }
  return <Chart options={options} series={[clampPct(value, min, max)]} type="radialBar" height={height} />
}

function clampPct(value: number, min: number, max: number) {
  if (max <= min) return 0
  const pct = ((value - min) / (max - min)) * 100
  return Math.max(0, Math.min(100, pct))
}