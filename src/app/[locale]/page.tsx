import type { Metadata } from "next"
import Link from "next/link"
import { ArrowRight, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { SiteHeader } from "@/components/marketing/site-header"
import { SiteFooter } from "@/components/marketing/site-footer"
import { DashboardPreview } from "@/components/marketing/dashboard-preview"
import { features, steps } from "@/components/marketing/features"

export const metadata: Metadata = {
  title: "RentalManager — Gestion locative simplifiée",
  description:
    "Biens, baux, loyers et locataires au même endroit. La plateforme de gestion locative pour les propriétaires et gestionnaires.",
}

const highlights = ["Loyers en FCFA", "Contrats PDF", "Rappels automatiques"]

export default function Home() {
  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <SiteHeader />

      <main className="flex-1">
        {/* Hero */}
        <section className="mx-auto w-full max-w-6xl px-4 pb-16 pt-16 sm:px-6 md:pb-24 md:pt-24">
          <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_1fr] lg:gap-16">
            <div className="animate-fade-up max-w-xl">
              <p className="mb-4 inline-flex items-center rounded-full border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
                Pour propriétaires, bailleurs et gestionnaires
              </p>
              <h1 className="text-4xl font-semibold leading-tight tracking-tight sm:text-5xl lg:text-[3.25rem]">
                Gérez vos biens locatifs sans effort
              </h1>
              <p className="mt-5 text-lg text-muted-foreground">
                Biens, baux, loyers et locataires réunis dans un seul outil clair. Moins de
                tableurs, moins d&apos;oublis, plus de loyers encaissés à temps.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button size="lg" className="h-11 px-6" asChild>
                  <Link href="/auth/register">
                    Commencer gratuitement
                    <ArrowRight className="h-4 w-4" aria-hidden />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" className="h-11 px-6" asChild>
                  <Link href="/auth/login">J&apos;ai déjà un compte</Link>
                </Button>
              </div>
              <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
                {highlights.map((item) => (
                  <li key={item} className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-success" aria-hidden />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="animate-fade-up" style={{ "--stagger": 2 } as React.CSSProperties}>
              <DashboardPreview />
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="border-y bg-muted/40">
          <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 md:py-20">
            <div className="max-w-2xl">
              <p className="text-sm font-medium text-primary">Comment ça marche</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
                Opérationnel en trois étapes
              </h2>
            </div>
            <ol className="mt-10 grid gap-6 md:grid-cols-3">
              {steps.map((step, i) => (
                <li
                  key={step.title}
                  className="animate-fade-up flex gap-4"
                  style={{ "--stagger": i } as React.CSSProperties}
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground tabular-nums">
                    {i + 1}
                  </span>
                  <div>
                    <h3 className="text-base font-semibold">{step.title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{step.description}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Features */}
        <section className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 md:py-24">
          <div className="max-w-2xl">
            <p className="text-sm font-medium text-primary">Fonctionnalités</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
              Tout ce qu&apos;il faut pour gérer vos locations
            </h2>
            <p className="mt-3 text-base text-muted-foreground">
              Des outils simples, pensés pour le quotidien d&apos;un bailleur : du premier bail
              jusqu&apos;à la restitution de la caution.
            </p>
          </div>
          <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((feature, i) => (
              <li
                key={feature.title}
                className="animate-fade-up rounded-xl border bg-card p-5 text-card-foreground shadow-card transition-shadow hover:shadow-card-hover"
                style={{ "--stagger": i } as React.CSSProperties}
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <feature.icon className="h-5 w-5" aria-hidden />
                </span>
                <h3 className="mt-4 text-base font-semibold">{feature.title}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{feature.description}</p>
              </li>
            ))}
          </ul>
        </section>

        {/* CTA */}
        <section className="border-t bg-muted/40">
          <div className="mx-auto flex w-full max-w-6xl flex-col items-start gap-6 px-4 py-16 sm:px-6 md:flex-row md:items-center md:justify-between md:py-20">
            <div className="max-w-xl">
              <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                Prêt à reprendre le contrôle de vos loyers ?
              </h2>
              <p className="mt-3 text-base text-muted-foreground">
                Créez votre compte en deux minutes. Aucune carte bancaire requise.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button size="lg" className="h-11 px-6" asChild>
                <Link href="/auth/register">
                  Créer mon compte
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
              </Button>
              <Button size="lg" variant="ghost" className="h-11 px-6" asChild>
                <Link href="/auth/login">Se connecter</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  )
}
