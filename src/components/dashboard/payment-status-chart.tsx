"use client"

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip
} from "recharts"

interface PaymentStatusChartProps {
  data: Array<{
    status: string
    _count: { status: number }
    _sum: { amount: number | null }
  }>
}

const COLORS = {
  PAID: "hsl(142 76% 36%)",
  PENDING: "hsl(47 96% 53%)",
  OVERDUE: "hsl(0 84% 60%)",
  CANCELLED: "hsl(240 5% 64%)"
}

export function PaymentStatusChart({ data }: PaymentStatusChartProps) {
  const chartData = data.map((item) => ({
    name: item.status,
    value: item._sum.amount || 0,
    count: item._count.status
  }))

  return (
    <ResponsiveContainer width="100%" height={350}>
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={({ name, percent }) => `${name} ${(Number(percent) * 100).toFixed(0)}%`}
          outerRadius={120}
          fill="#8884d8"
          dataKey="value"
        >
          {chartData.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={COLORS[entry.name as keyof typeof COLORS] || "#8884d8"}
            />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            backgroundColor: "hsl(var(--background))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "8px"
          }}
          formatter={(value: number, name: string, props: any) => [
            `$${value.toLocaleString()} (${props.payload.count} payments)`,
            name
          ]}
        />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  )
}
