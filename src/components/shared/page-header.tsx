"use client"

import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface PageHeaderProps {
  title: string
  description?: string
  /** Back link shown as an icon button before the title */
  backHref?: string
  /** Back handler (e.g. router.back) when a fixed href doesn't fit; ignored if backHref is set */
  onBack?: () => void
  /** Let long titles wrap instead of truncating */
  wrapTitle?: boolean
  /** Right-aligned actions (buttons, menus) */
  actions?: React.ReactNode
  /** Small content under the title (badges, meta) */
  children?: React.ReactNode
  className?: string
}

export function PageHeader({
  title,
  description,
  backHref,
  onBack,
  wrapTitle = false,
  actions,
  children,
  className,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        "animate-fade-up flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between",
        className
      )}
    >
      <div className="flex min-w-0 items-start gap-3">
        {backHref ? (
          <Button variant="ghost" size="icon" className="-ml-2 mt-0.5 shrink-0" asChild>
            <Link href={backHref} aria-label="Retour">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
        ) : onBack ? (
          <Button
            variant="ghost"
            size="icon"
            className="-ml-2 mt-0.5 shrink-0"
            onClick={onBack}
            aria-label="Retour"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
        ) : null}
        <div className="min-w-0 space-y-1">
          <h1 className={cn("text-2xl font-semibold sm:text-3xl", !wrapTitle && "truncate")}>{title}</h1>
          {description && <p className="text-sm text-muted-foreground sm:text-base">{description}</p>}
          {children && <div className="flex flex-wrap items-center gap-2 pt-1">{children}</div>}
        </div>
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}
