import type { LucideIcon } from "lucide-react"
import { ArrowDownRight, ArrowUpRight } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

export type Tone = "default" | "primary" | "success" | "warning" | "danger" | "info"

const toneClasses: Record<Tone, string> = {
  default: "bg-muted text-muted-foreground",
  primary: "bg-primary/10 text-primary",
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  danger: "bg-destructive/10 text-destructive",
  info: "bg-info/10 text-info",
}

interface StatCardProps {
  title: string
  value: string | number
  description?: string
  icon: LucideIcon
  /** Icon tint; keep "default" unless the number itself carries meaning */
  tone?: Tone
  trend?: {
    value: number
    isPositive: boolean
    label?: string
  }
  /** Index used to stagger the entrance animation in a grid */
  index?: number
  className?: string
  /** Extra classes for the value, e.g. "text-destructive" when the number itself is a warning */
  valueClassName?: string
}

export function StatCard({
  title,
  value,
  description,
  icon: Icon,
  tone = "default",
  trend,
  index = 0,
  className,
  valueClassName,
}: StatCardProps) {
  return (
    <Card
      className={cn("animate-fade-up gap-0 py-5", className)}
      style={{ "--stagger": index } as React.CSSProperties}
    >
      <CardContent className="flex items-start justify-between gap-4 px-5">
        <div className="min-w-0 space-y-1">
          <p className="text-sm font-medium leading-snug text-muted-foreground">{title}</p>
          <p
            className={cn(
              "break-words text-xl font-semibold leading-tight tabular-nums tracking-tight lg:text-2xl",
              valueClassName
            )}
          >
            {value}
          </p>
          {description && <p className="text-xs text-muted-foreground">{description}</p>}
          {trend && (
            <p
              className={cn(
                "flex items-center gap-1 text-xs font-medium",
                trend.isPositive ? "text-success" : "text-destructive"
              )}
            >
              {trend.isPositive ? (
                <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
              ) : (
                <ArrowDownRight className="h-3.5 w-3.5" aria-hidden />
              )}
              {trend.isPositive ? "+" : ""}
              {trend.value}% {trend.label ?? "vs mois dernier"}
            </p>
          )}
        </div>
        <span
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
            toneClasses[tone]
          )}
        >
          <Icon className="h-5 w-5" aria-hidden />
        </span>
      </CardContent>
    </Card>
  )
}
