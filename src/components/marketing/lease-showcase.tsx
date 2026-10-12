"use client"

import { useEffect, useRef, useState, useSyncExternalStore } from "react"
import { FileDown, FileText } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { StatusBadge } from "@/components/shared/status-badge"
import { cn } from "@/lib/utils"
import type { StepKey } from "./features"

export interface LeaseShowcaseCopy {
  steps: { key: StepKey; title: string; description: string }[]
  lease: string
  tenantLabel: string
  tenant: string
  initials: string
  periodLabel: string
  period: string
  rentLabel: string
  rent: string
  depositLabel: string
  deposit: string
  schedule: string
  collectedBefore: string
  collectedAfter: string
  download: string
  /** Six month names, January → June, already in the page locale */
  months: string[]
  amount: string
  status: Record<"active" | "paid" | "pending" | "overdue" | "held", string>
  summary: string
}

type PaymentStatus = "PAID" | "PENDING" | "OVERDUE"

// January → June. The May row ("current" month) is the one that gets paid during the animation.
const SCHEDULE: PaymentStatus[] = ["PAID", "PAID", "PAID", "OVERDUE", "PENDING", "PENDING"]
const CURRENT_ROW = 4
const TOTAL = 12

const STATUS_KEY = { PAID: "paid", PENDING: "pending", OVERDUE: "overdue" } as const

/**
 * Animation phases, played once when the preview scrolls into view:
 * 0 hidden → 1 card + rows enter (rows staggered 80 ms) → 2 May is paid
 * (badge cross-fade, row highlight, progress 3/12 → 4/12) → 3 settled.
 * The contract button gets a single focus-ring pulse between 2 and 3.
 */
type Phase = 0 | 1 | 2 | 3

const T_PAID = 1300
const T_PULSE_ON = 1850
const T_PULSE_OFF = 2450
const T_SETTLED = 2700

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)"

function subscribeReducedMotion(onChange: () => void) {
  const query = window.matchMedia(REDUCED_MOTION)
  query.addEventListener("change", onChange)
  return () => query.removeEventListener("change", onChange)
}

/** Reduced motion (or no IntersectionObserver): show the final state, skip the sequence. */
function useSkipAnimation() {
  return useSyncExternalStore(
    subscribeReducedMotion,
    () => window.matchMedia(REDUCED_MOTION).matches || typeof IntersectionObserver === "undefined",
    () => false,
  )
}

interface LeaseShowcaseProps {
  copy: LeaseShowcaseCopy
  heading: React.ReactNode
}

export function LeaseShowcase({ copy, heading }: LeaseShowcaseProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [played, setPlayed] = useState<Phase>(0)
  const [pulse, setPulse] = useState(false)
  // Reduced motion: final state right away, without transition delays
  const instant = useSkipAnimation()
  const phase: Phase = instant ? 3 : played
  const [activeStep, setActiveStep] = useState<StepKey | null>(null)

  useEffect(() => {
    const node = ref.current
    if (!node || instant) return

    const timers: number[] = []
    const play = () => {
      setPlayed(1)
      timers.push(
        window.setTimeout(() => setPlayed(2), T_PAID),
        window.setTimeout(() => setPulse(true), T_PULSE_ON),
        window.setTimeout(() => setPulse(false), T_PULSE_OFF),
        window.setTimeout(() => setPlayed(3), T_SETTLED),
      )
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          observer.disconnect()
          play()
        }
      },
      { threshold: 0.35 },
    )
    observer.observe(node)

    return () => {
      observer.disconnect()
      timers.forEach((id) => window.clearTimeout(id))
    }
  }, [instant])

  const visible = phase >= 1
  const paid = phase >= 2
  const highlight = (step: StepKey) => activeStep === step

  return (
    <>
      <div className="flex flex-col gap-10">
        {heading}
        <ol className="grid gap-6 md:grid-cols-3 lg:grid-cols-1 lg:gap-3">
          {copy.steps.map((step, i) => (
            <li
              key={step.key}
              className={cn(
                "animate-fade-up flex gap-4 rounded-xl border border-transparent transition-colors lg:-mx-4 lg:p-4",
                highlight(step.key) && "lg:border-border lg:bg-card",
              )}
              style={{ "--stagger": i } as React.CSSProperties}
              onMouseEnter={() => setActiveStep(step.key)}
              onMouseLeave={() => setActiveStep(null)}
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

      <div ref={ref} className="w-full max-w-xl justify-self-center lg:max-w-none">
        <p className="sr-only">{copy.summary}</p>
        {/* Decorative illustration: hidden from assistive tech and not focusable */}
        <Card
          aria-hidden
          inert
          className={cn(
            "gap-3 p-4 shadow-card-hover transition-[opacity,transform] duration-300 ease-out sm:p-5",
            visible ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0",
          )}
        >
          {/* 1 — the property: address, rent, deposit */}
          <Part number={1} active={highlight("properties")}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <FileText className="h-4 w-4" />
                </span>
                <p className="min-w-0 text-sm font-semibold leading-snug">{copy.lease}</p>
              </div>
              <StatusBadge kind="lease" status="ACTIVE" label={copy.status.active} />
            </div>
            <dl className="mt-3 grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-muted/60 px-3 py-2">
                <dt className="text-xs text-muted-foreground">{copy.rentLabel}</dt>
                <dd className="mt-0.5 text-sm font-semibold tabular-nums">{copy.rent}</dd>
              </div>
              <div className="rounded-lg bg-muted/60 px-3 py-2">
                <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  {copy.depositLabel}
                  <StatusBadge kind="deposit" status="HELD" label={copy.status.held} className="px-1.5 py-0 text-[11px]" />
                </dt>
                <dd className="mt-0.5 text-sm font-semibold tabular-nums">{copy.deposit}</dd>
              </div>
            </dl>
          </Part>

          {/* 2 — the lease: tenant, dates, contract */}
          <Part number={2} active={highlight("leases")}>
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
              <div className="flex items-center gap-2.5">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-info/10 text-xs font-semibold text-info">{copy.initials}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium leading-tight">{copy.tenant}</p>
                  <p className="text-xs text-muted-foreground">{copy.tenantLabel}</p>
                </div>
              </div>
              <div className="text-left sm:text-right">
                <p className="text-xs text-muted-foreground">{copy.periodLabel}</p>
                <p className="text-sm font-medium tabular-nums">{copy.period}</p>
              </div>
            </div>
            <div className="relative mt-3">
              <span className="flex h-9 w-full items-center justify-center gap-2 rounded-lg border bg-background px-3 text-sm font-medium shadow-xs">
                <FileDown className="h-4 w-4 text-primary" />
                {copy.download}
                <Badge variant="muted" className="px-1.5 py-0 text-[11px]">PDF</Badge>
              </span>
              {/* One-off focus ring pulse (opacity only) */}
              <span
                className={cn(
                  "pointer-events-none absolute -inset-[3px] rounded-[11px] border-2 border-ring/60 transition-opacity duration-300",
                  pulse ? "opacity-100" : "opacity-0",
                )}
              />
            </div>
          </Part>

          {/* 3 — the rent: payment schedule */}
          <Part number={3} active={highlight("rent")}>
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
              <p className="text-sm font-semibold">{copy.schedule}</p>
              <p className="whitespace-nowrap text-xs text-muted-foreground tabular-nums">
                {paid ? copy.collectedAfter : copy.collectedBefore}
              </p>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full w-full origin-left rounded-full bg-success transition-transform duration-400 ease-out"
                style={{ transform: `scaleX(${(paid ? 4 : 3) / TOTAL})` }}
              />
            </div>
            <ul className="mt-3 divide-y rounded-lg border">
              {SCHEDULE.map((status, i) => {
                const isCurrent = i === CURRENT_ROW
                return (
                  <li
                    key={copy.months[i]}
                    className={cn(
                      "grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 px-3 py-2 transition-[opacity,transform,background-color] duration-300 ease-out",
                      visible ? "translate-y-0 opacity-100" : "translate-y-1 opacity-0",
                      isCurrent && phase === 2 && "bg-success/10",
                      isCurrent && phase === 3 && "bg-muted/50",
                    )}
                    style={{ transitionDelay: visible && phase === 1 && !instant ? `${200 + i * 80}ms` : undefined }}
                  >
                    <span className="truncate text-sm">{copy.months[i]}</span>
                    <span className="text-xs text-muted-foreground tabular-nums">{copy.amount}</span>
                    {/* Fixed-width badge column (fits the widest label) so amounts line up */}
                    {isCurrent ? (
                      // Both badges share one grid cell: the wider one reserves the space, no layout shift
                      <span className="grid w-[5.25rem] justify-items-end [&>*]:col-start-1 [&>*]:row-start-1">
                        <StatusBadge
                          kind="payment"
                          status="PENDING"
                          label={copy.status.pending}
                          className={cn("transition-opacity duration-300", paid ? "opacity-0" : "opacity-100")}
                        />
                        <StatusBadge
                          kind="payment"
                          status="PAID"
                          label={copy.status.paid}
                          className={cn(
                            "transition-[opacity,transform] duration-300",
                            paid ? "scale-100 opacity-100" : "scale-90 opacity-0",
                          )}
                        />
                      </span>
                    ) : (
                      <span className="grid w-[5.25rem] justify-items-end">
                        <StatusBadge kind="payment" status={status} label={copy.status[STATUS_KEY[status]]} />
                      </span>
                    )}
                  </li>
                )
              })}
            </ul>
          </Part>
        </Card>
      </div>
    </>
  )
}

/** A numbered area of the preview, matching step `number` on the left. */
function Part({ number, active, children }: { number: number; active: boolean; children: React.ReactNode }) {
  return (
    <div
      className={cn(
        "relative rounded-lg border p-3 transition-colors duration-200",
        active ? "border-primary/40 bg-primary/5" : "bg-background",
      )}
    >
      <span className="absolute -left-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[11px] font-semibold text-primary-foreground tabular-nums">
        {number}
      </span>
      {children}
    </div>
  )
}
