"use client"

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  type TooltipProps,
} from "recharts"
import { formatCurrency } from "@/lib/utils"
import { axisTick, chartColors, ChartEmpty, legendStyle, tooltipStyles } from "./chart-theme"

export type RevenuePoint = {
  month: string
  total: number
  paid: number
  pending: number
  overdue: number
}

interface RevenueChartProps {
  data: RevenuePoint[]
}

const SERIES = [
  { key: "paid", name: "Encaissé", color: chartColors.paid },
  { key: "pending", name: "En attente", color: chartColors.pending },
  { key: "overdue", name: "En retard", color: chartColors.overdue },
] as const

const compactNumber = new Intl.NumberFormat("fr-FR", { notation: "compact", maximumFractionDigits: 1 })

const formatTooltip: TooltipProps<number, string>["formatter"] = (value, name) => [
  formatCurrency(Number(value)),
  name,
]

export function RevenueChart({ data }: RevenueChartProps) {
  if (data.length === 0) {
    return <ChartEmpty message="Aucun paiement sur les 12 derniers mois." />
  }

  return (
    <ResponsiveContainer width="100%" height={340}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke={chartColors.grid} strokeDasharray="3 3" />
        <XAxis dataKey="month" tick={axisTick} tickLine={false} axisLine={false} dy={6} />
        <YAxis
          tick={axisTick}
          tickLine={false}
          axisLine={false}
          width={56}
          tickFormatter={(value: number) => compactNumber.format(value)}
        />
        <Tooltip
          {...tooltipStyles}
          cursor={{ stroke: chartColors.grid }}
          formatter={formatTooltip}
        />
        <Legend iconType="circle" iconSize={8} wrapperStyle={legendStyle} />
        {SERIES.map((s) => (
          <Area
            key={s.key}
            type="monotone"
            dataKey={s.key}
            stackId="1"
            name={s.name}
            stroke={s.color}
            strokeWidth={2}
            fill={s.color}
            fillOpacity={0.1}
            isAnimationActive={false}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  )
}
