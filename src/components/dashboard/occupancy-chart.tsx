"use client"

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  type TooltipProps,
} from "recharts"
import { axisTick, chartColors, ChartEmpty, tooltipStyles } from "./chart-theme"

export interface OccupancyPoint {
  month: string
  rate: number
  occupied: number
  total: number
}

interface OccupancyChartProps {
  data: OccupancyPoint[]
}

const formatTooltip: TooltipProps<number, string>["formatter"] = (value, _name, item) => {
  const row = item.payload as OccupancyPoint | undefined
  const detail = row ? ` (${row.occupied}/${row.total} biens)` : ""
  return [`${value} %${detail}`, "Taux d'occupation"]
}

export function OccupancyChart({ data }: OccupancyChartProps) {
  if (data.length === 0 || data.every((d) => d.total === 0)) {
    return <ChartEmpty message="Ajoutez un bien pour suivre votre taux d'occupation." />
  }

  return (
    <ResponsiveContainer width="100%" height={340}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke={chartColors.grid} strokeDasharray="3 3" />
        <XAxis dataKey="month" tick={axisTick} tickLine={false} axisLine={false} dy={6} />
        <YAxis
          tick={axisTick}
          tickLine={false}
          axisLine={false}
          width={44}
          tickFormatter={(value: number) => `${value} %`}
          domain={[0, 100]}
        />
        <Tooltip
          {...tooltipStyles}
          cursor={{ stroke: chartColors.grid }}
          formatter={formatTooltip}
        />
        <Line
          type="monotone"
          dataKey="rate"
          name="Taux d'occupation"
          stroke={chartColors.secondary}
          strokeWidth={2}
          dot={{ fill: chartColors.secondary, stroke: "var(--card)", strokeWidth: 2, r: 4 }}
          activeDot={{ r: 6, stroke: "var(--card)", strokeWidth: 2 }}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
