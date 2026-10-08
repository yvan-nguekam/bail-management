import { Building2, FileText, Wallet } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { formatCurrency } from "@/lib/utils"

const stats = [
  { label: "Biens", value: "12", icon: Building2, tone: "bg-primary/10 text-primary" },
  { label: "Baux actifs", value: "10", icon: FileText, tone: "bg-info/10 text-info" },
  { label: "Loyers du mois", value: formatCurrency(1850000), icon: Wallet, tone: "bg-success/10 text-success" },
]

const rows = [
  { property: "Résidence Les Palmiers, A3", tenant: "A. Mbarga", amount: 250000, status: "Payé", variant: "success" as const },
  { property: "Villa Bastos", tenant: "C. Nkoulou", amount: 450000, status: "En attente", variant: "muted" as const },
  { property: "Studio Bonapriso", tenant: "F. Tchamba", amount: 150000, status: "En retard", variant: "danger" as const },
]

/** Static, illustrative snapshot of the dashboard used in the hero. */
export function DashboardPreview() {
  return (
    <div
      aria-hidden
      className="rounded-xl border bg-card p-4 text-card-foreground shadow-card-hover sm:p-5"
    >
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold">Tableau de bord</p>
          <p className="text-xs text-muted-foreground">Octobre 2026</p>
        </div>
        <span className="rounded-full bg-success/10 px-2 py-0.5 text-xs font-medium text-success">
          Taux d&apos;occupation 83 %
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {stats.map((s) => (
          <div key={s.label} className="flex items-center gap-3 rounded-lg border bg-background p-3">
            <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${s.tone}`}>
              <s.icon className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="text-xs leading-tight text-muted-foreground">{s.label}</p>
              <p className="text-sm font-semibold leading-tight tabular-nums">{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 divide-y rounded-lg border">
        {rows.map((r) => (
          <div key={r.property} className="flex items-center justify-between gap-3 px-3 py-2.5">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{r.property}</p>
              <p className="truncate text-xs text-muted-foreground">{r.tenant}</p>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <span className="hidden text-sm font-medium tabular-nums sm:inline">
                {formatCurrency(r.amount)}
              </span>
              <Badge variant={r.variant}>{r.status}</Badge>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
