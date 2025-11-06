"use client"

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from "recharts"

interface RevenueChartProps {
  data: Array<{
    month: string
    total: number
    paid: number
    pending: number
    overdue: number
  }>
}

export function RevenueChart({ data }: RevenueChartProps) {
  return (
    <ResponsiveContainer width="100%" height={350}>
      <AreaChart data={data}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis
          dataKey="month"
          className="text-xs"
          tick={{ fill: "hsl(var(--muted-foreground))" }}
        />
        <YAxis
          className="text-xs"
          tick={{ fill: "hsl(var(--muted-foreground))" }}
          tickFormatter={(value) => `$${value}`}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "hsl(var(--background))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "8px"
          }}
          formatter={(value: number) => [`$${value.toLocaleString()}`, ""]}
        />
        <Legend />
        <Area
          type="monotone"
          dataKey="paid"
          stackId="1"
          stroke="hsl(142 76% 36%)"
          fill="hsl(142 76% 36%)"
          fillOpacity={0.6}
          name="Paid"
        />
        <Area
          type="monotone"
          dataKey="pending"
          stackId="1"
          stroke="hsl(47 96% 53%)"
          fill="hsl(47 96% 53%)"
          fillOpacity={0.6}
          name="Pending"
        />
        <Area
          type="monotone"
          dataKey="overdue"
          stackId="1"
          stroke="hsl(0 84% 60%)"
          fill="hsl(0 84% 60%)"
          fillOpacity={0.6}
          name="Overdue"
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
