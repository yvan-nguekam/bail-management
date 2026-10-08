import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description?: string
  /** Usually a Button or a Link styled as one */
  action?: React.ReactNode
  /** "sm" for empty states nested inside a card */
  size?: "default" | "sm"
  className?: string
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  size = "default",
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "animate-fade-in flex flex-col items-center justify-center rounded-xl border border-dashed px-6 text-center",
        size === "sm" ? "py-8" : "py-14",
        className
      )}
    >
      <div
        className={cn(
          "mb-3 flex items-center justify-center rounded-full bg-muted",
          size === "sm" ? "h-10 w-10" : "h-12 w-12"
        )}
      >
        <Icon className={cn("text-muted-foreground", size === "sm" ? "h-5 w-5" : "h-6 w-6")} aria-hidden />
      </div>
      <h3 className={cn("font-semibold", size === "sm" ? "text-sm" : "text-base")}>{title}</h3>
      {description && (
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}
