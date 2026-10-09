import { getLocale, getTranslations } from "next-intl/server"
import { formatCurrency } from "@/lib/utils"
import { steps } from "./features"
import { LeaseShowcase, type LeaseShowcaseCopy } from "./lease-showcase"

const PROPERTY = "Résidence Les Palmiers, A3"
const TENANT = "Awa Mbarga"
const RENT = 250000
const DEPOSIT = 500000

/**
 * "Comment ça marche" section: the three steps next to an animated lease preview.
 * All strings (dates, amounts, months) are computed here on the server so the
 * client component only animates and never re-formats anything (no hydration drift).
 */
export async function HowItWorks() {
  const [t, tPreview, tStatus, locale] = await Promise.all([
    getTranslations("landing.steps"),
    getTranslations("landing.leasePreview"),
    getTranslations("landing.status"),
    getLocale(),
  ])

  const date = new Intl.DateTimeFormat(locale, { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" })
  const month = new Intl.DateTimeFormat(locale, { month: "long", timeZone: "UTC" })
  const start = date.format(new Date(Date.UTC(2026, 0, 1)))
  const end = date.format(new Date(Date.UTC(2026, 11, 31)))
  const capitalize = (s: string) => s.charAt(0).toLocaleUpperCase(locale) + s.slice(1)

  const copy: LeaseShowcaseCopy = {
    steps: steps.map((key) => ({ key, title: t(`${key}.title`), description: t(`${key}.description`) })),
    lease: tPreview("lease", { property: PROPERTY }),
    tenantLabel: tPreview("tenant"),
    tenant: TENANT,
    initials: "AM",
    periodLabel: tPreview("period"),
    period: `${start} → ${end}`,
    rentLabel: tPreview("monthlyRent"),
    rent: formatCurrency(RENT),
    depositLabel: tPreview("deposit"),
    deposit: formatCurrency(DEPOSIT),
    schedule: tPreview("schedule"),
    collectedBefore: tPreview("collected", { paid: 3, total: 12 }),
    collectedAfter: tPreview("collected", { paid: 4, total: 12 }),
    download: tPreview("download"),
    months: Array.from({ length: 6 }, (_, i) => capitalize(month.format(new Date(Date.UTC(2026, i, 1))))),
    amount: formatCurrency(RENT),
    status: {
      active: tStatus("active"),
      paid: tStatus("paid"),
      pending: tStatus("pending"),
      overdue: tStatus("overdue"),
      held: tStatus("held"),
    },
    summary: tPreview("summary", {
      property: PROPERTY,
      tenant: TENANT,
      start,
      end,
      rent: formatCurrency(RENT),
      deposit: formatCurrency(DEPOSIT),
      paid: 4,
      total: 12,
    }),
  }

  return (
    <section className="border-y bg-muted/40">
      <div className="mx-auto grid w-full max-w-6xl items-center gap-10 px-4 py-16 sm:px-6 md:py-20 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:gap-16">
        <LeaseShowcase
          copy={copy}
          heading={
            <div className="max-w-2xl">
              <p className="text-sm font-medium text-primary">{t("eyebrow")}</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">{t("title")}</h2>
            </div>
          }
        />
      </div>
    </section>
  )
}
