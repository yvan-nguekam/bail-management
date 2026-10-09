import type { Metadata } from "next"
import { ArrowRight, Check } from "lucide-react"
import { getTranslations, setRequestLocale } from "next-intl/server"
import { Button } from "@/components/ui/button"
import { SiteHeader } from "@/components/marketing/site-header"
import { SiteFooter } from "@/components/marketing/site-footer"
import { DashboardPreview } from "@/components/marketing/dashboard-preview"
import { HowItWorks } from "@/components/marketing/how-it-works"
import { features } from "@/components/marketing/features"
import { Link } from "@/i18n/navigation"
import { defaultLocale, isLocale } from "@/i18n/routing"

interface PageProps {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale: requested } = await params
  const locale = isLocale(requested) ? requested : defaultLocale
  const t = await getTranslations({ locale, namespace: "landing.meta" })
  return {
    // absolute: the title already contains the brand, skip the layout's "%s · RentalManager" template
    title: { absolute: t("title") },
    description: t("description"),
    alternates: { languages: { fr: "/", en: "/en" } },
  }
}

const highlights = ["currency", "contracts", "reminders"] as const

export default async function Home({ params }: PageProps) {
  const { locale } = await params
  // Locale already validated by the layout; enables static rendering per locale
  setRequestLocale(locale)

  const [tHero, tFeatures, tCta] = await Promise.all([
    getTranslations("landing.hero"),
    getTranslations("landing.features"),
    getTranslations("landing.cta"),
  ])

  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <SiteHeader />

      <main className="flex-1">
        {/* Hero */}
        <section className="mx-auto w-full max-w-6xl px-4 pb-16 pt-16 sm:px-6 md:pb-24 md:pt-24">
          <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_1fr] lg:gap-16">
            <div className="animate-fade-up max-w-xl">
              <p className="mb-4 inline-flex items-center rounded-full border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
                {tHero("eyebrow")}
              </p>
              <h1 className="text-4xl font-semibold leading-tight tracking-tight sm:text-5xl lg:text-[3.25rem]">
                {tHero("title")}
              </h1>
              <p className="mt-5 text-lg text-muted-foreground">{tHero("subtitle")}</p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button size="lg" className="h-11 px-6" asChild>
                  <Link href="/auth/register">
                    {tHero("primaryCta")}
                    <ArrowRight className="h-4 w-4" aria-hidden />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" className="h-11 px-6" asChild>
                  <Link href="/auth/login">{tHero("secondaryCta")}</Link>
                </Button>
              </div>
              <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
                {highlights.map((key) => (
                  <li key={key} className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-success" aria-hidden />
                    {tHero(`highlights.${key}`)}
                  </li>
                ))}
              </ul>
            </div>
            <div className="animate-fade-up" style={{ "--stagger": 2 } as React.CSSProperties}>
              <DashboardPreview />
            </div>
          </div>
        </section>

        {/* How it works + animated lease preview */}
        <HowItWorks />

        {/* Features */}
        <section className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 md:py-24">
          <div className="max-w-2xl">
            <p className="text-sm font-medium text-primary">{tFeatures("eyebrow")}</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">{tFeatures("title")}</h2>
            <p className="mt-3 text-base text-muted-foreground">{tFeatures("subtitle")}</p>
          </div>
          <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((feature, i) => (
              <li
                key={feature.key}
                className="animate-fade-up rounded-xl border bg-card p-5 text-card-foreground shadow-card transition-shadow hover:shadow-card-hover"
                style={{ "--stagger": i } as React.CSSProperties}
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <feature.icon className="h-5 w-5" aria-hidden />
                </span>
                <h3 className="mt-4 text-base font-semibold">{tFeatures(`${feature.key}.title`)}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{tFeatures(`${feature.key}.description`)}</p>
              </li>
            ))}
          </ul>
        </section>

        {/* CTA */}
        <section className="border-t bg-muted/40">
          <div className="mx-auto flex w-full max-w-6xl flex-col items-start gap-6 px-4 py-16 sm:px-6 md:flex-row md:items-center md:justify-between md:py-20">
            <div className="max-w-xl">
              <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">{tCta("title")}</h2>
              <p className="mt-3 text-base text-muted-foreground">{tCta("subtitle")}</p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button size="lg" className="h-11 px-6" asChild>
                <Link href="/auth/register">
                  {tCta("primary")}
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
              </Button>
              <Button size="lg" variant="ghost" className="h-11 px-6" asChild>
                <Link href="/auth/login">{tCta("secondary")}</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  )
}
