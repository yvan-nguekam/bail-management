import type { CSSProperties } from "react"

/**
 * Shared Recharts styling bound to the CSS tokens so every chart reads
 * correctly in both themes without hard-coded colors.
 */
export const chartColors = {
  paid: "var(--success)",
  pending: "var(--warning)",
  overdue: "var(--destructive)",
  cancelled: "var(--chart-4)",
  primary: "var(--chart-1)",
  secondary: "var(--chart-2)",
  grid: "var(--border)",
  text: "var(--muted-foreground)",
} as const

export const axisTick = { fill: chartColors.text, fontSize: 12 }

export const tooltipStyles = {
  contentStyle: {
    backgroundColor: "var(--popover)",
    border: "1px solid var(--border)",
    borderRadius: "0.75rem",
    boxShadow: "var(--shadow-card-hover)",
    color: "var(--popover-foreground)",
    fontSize: 13,
    padding: "8px 12px",
  } satisfies CSSProperties,
  labelStyle: { color: "var(--popover-foreground)", fontWeight: 600, marginBottom: 4 } satisfies CSSProperties,
  itemStyle: { color: "var(--popover-foreground)", padding: 0 } satisfies CSSProperties,
}

export const legendStyle: CSSProperties = {
  fontSize: 12,
  color: chartColors.text,
  paddingTop: 12,
}

/** Message shown instead of an empty chart */
export function ChartEmpty({ message }: { message: string }) {
  return (
    <div className="flex h-[300px] items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
      {message}
    </div>
  )
}
