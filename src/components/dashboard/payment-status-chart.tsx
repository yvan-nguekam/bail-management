"use client"

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
  type TooltipProps,
} from "recharts"
import { formatCurrency } from "@/lib/utils"
import { statusLabel } from "@/components/shared/status-badge"
import { chartColors, ChartEmpty, legendStyle, tooltipStyles } from "./chart-theme"

export interface PaymentStatusStat {
  status: string
  _count: { status: number }
  _sum: { amount: number | null }
}

interface PaymentStatusChartProps {
  data: PaymentStatusStat[]
}

const COLORS: Record<string, string> = {
  PAID: chartColors.paid,
  PENDING: chartColors.pending,
  OVERDUE: chartColors.overdue,
  CANCELLED: chartColors.cancelled,
}

type Slice = {
  name: string
  status: string
  value: number
  count: number
}

const formatTooltip: TooltipProps<number, string>["formatter"] = (value, name, item) => {
  const slice = item.payload as Slice | undefined
  const count = slice?.count ?? 0
  return [
    `${formatCurrency(Number(value))} · ${count} paiement${count > 1 ? "s" : ""}`,
    name,
  ]
}

export function PaymentStatusChart({ data }: PaymentStatusChartProps) {
  const chartData: Slice[] = data.map((item) => ({
    name: statusLabel("payment", item.status),
    status: item.status,
    value: item._sum.amount || 0,
    count: item._count.status,
  }))

  const total = chartData.reduce((sum, s) => sum + s.value, 0)

  if (chartData.length === 0 || total === 0) {
    return <ChartEmpty message="Aucun paiement enregistré pour le moment." />
  }

  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={340}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="45%"
            innerRadius={70}
            outerRadius={110}
            paddingAngle={2}
            dataKey="value"
            nameKey="name"
            stroke="var(--card)"
            strokeWidth={2}
            isAnimationActive={false}
          >
            {chartData.map((entry) => (
              <Cell key={entry.status} fill={COLORS[entry.status] ?? chartColors.primary} />
            ))}
          </Pie>
          <Tooltip {...tooltipStyles} formatter={formatTooltip} />
          <Legend iconType="circle" iconSize={8} wrapperStyle={legendStyle} />
        </PieChart>
      </ResponsiveContainer>
      {/* Centered total, read by the tooltip-free eye */}
      <div
        className="pointer-events-none absolute left-1/2 top-[45%] -translate-x-1/2 -translate-y-1/2 text-center"
        aria-hidden
      >
        <p className="text-xs text-muted-foreground">Total</p>
        <p className="text-sm font-semibold tabular-nums sm:text-base">{formatCurrency(total)}</p>
      </div>
    </div>
  )
}
