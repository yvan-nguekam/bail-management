import Link from "next/link"
import type { LucideIcon } from "lucide-react"
import { ChevronRight } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export interface QuickAction {
  href: string
  icon: LucideIcon
  title: string
  description: string
}

interface QuickActionsProps {
  actions: QuickAction[]
  /** Stagger offset for the entrance animation */
  index?: number
}

export function QuickActions({ actions, index = 0 }: QuickActionsProps) {
  return (
    <Card className="animate-fade-up" style={{ "--stagger": index } as React.CSSProperties}>
      <CardHeader>
        <CardTitle>Actions rapides</CardTitle>
        <CardDescription>Les tâches les plus courantes, à portée de clic.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 sm:grid-cols-3">
          {actions.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className="group flex min-h-11 items-center gap-3 rounded-lg border bg-background p-3 transition-colors hover:bg-accent focus-visible:outline-2"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <action.icon className="h-5 w-5" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{action.title}</span>
                <span className="block truncate text-xs text-muted-foreground">
                  {action.description}
                </span>
              </span>
              <ChevronRight
                className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
                aria-hidden
              />
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
