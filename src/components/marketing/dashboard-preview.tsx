import { Building2, FileText, Wallet } from "lucide-react"
import { getLocale, getTranslations } from "next-intl/server"
import { StatusBadge } from "@/components/shared/status-badge"
import { formatCurrency } from "@/lib/utils"

const rows = [
  { property: "Résidence Les Palmiers, A3", tenant: "A. Mbarga", amount: 250000, status: "PAID", label: "paid" },
  { property: "Villa Bastos", tenant: "C. Nkoulou", amount: 450000, status: "PENDING", label: "pending" },
  { property: "Studio Bonapriso", tenant: "F. Tchamba", amount: 150000, status: "OVERDUE", label: "overdue" },
] as const

/** "Octobre 2026" / "October 2026": month label in the page locale. */
function monthLabel(locale: string, date: Date) {
  const label = new Intl.DateTimeFormat(locale, { month: "long", year: "numeric", timeZone: "UTC" }).format(date)
  return label.charAt(0).toLocaleUpperCase(locale) + label.slice(1)
}

/** Static, illustrative snapshot of the dashboard used in the hero. */
export async function DashboardPreview() {
  const [t, tStatus, locale] = await Promise.all([
    getTranslations("landing.dashboardPreview"),
    getTranslations("landing.status"),
    getLocale(),
  ])

  const stats = [
    { label: t("properties"), value: "12", icon: Building2, tone: "bg-primary/10 text-primary" },
    { label: t("activeLeases"), value: "10", icon: FileText, tone: "bg-info/10 text-info" },
    { label: t("monthlyRent"), value: formatCurrency(1850000), icon: Wallet, tone: "bg-success/10 text-success" },
  ]

  return (
    <div
      aria-hidden
      className="rounded-xl border bg-card p-4 text-card-foreground shadow-card-hover sm:p-5"
    >
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold">{t("title")}</p>
          <p className="text-xs text-muted-foreground">{monthLabel(locale, new Date(Date.UTC(2026, 9, 1)))}</p>
        </div>
        <span className="rounded-full bg-success/10 px-2 py-0.5 text-xs font-medium text-success">
          {t("occupancy", { rate: 83 })}
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
              <StatusBadge kind="payment" status={r.status} label={tStatus(r.label)} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
