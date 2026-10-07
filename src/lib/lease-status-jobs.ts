import type { PrismaClient } from "@prisma/client"
import { addUtcDays, toUtcDay } from "@/lib/payment-schedule"
import { EXPIRY_NOTICE_DAYS, daysUntil, decideExpiryNotice } from "@/lib/lease-automation"
import { formatCurrency } from "@/lib/utils"

// Scheduled jobs keeping lease and payment statuses in line with the calendar.
// Every job is idempotent: running it twice the same day changes nothing more.

const formatDay = (date: Date) => date.toLocaleDateString("fr-FR", { timeZone: "UTC" })

const leaseWithParties = {
  property: { select: { id: true, name: true, ownerId: true, managerId: true } },
} as const

function landlordIds(property: { ownerId: string; managerId: string | null }) {
  return property.managerId && property.managerId !== property.ownerId
    ? [property.ownerId, property.managerId]
    : [property.ownerId]
}

async function propertyHasOtherActiveLease(db: PrismaClient, propertyId: string, leaseId: string) {
  const other = await db.lease.findFirst({
    where: { propertyId, status: "ACTIVE", id: { not: leaseId } },
    select: { id: true },
  })
  return other !== null
}

/** DRAFT leases whose start date has come become ACTIVE (property becomes OCCUPIED). */
export async function activateStartedLeases(db: PrismaClient, now: Date) {
  const today = toUtcDay(now)
  const leases = await db.lease.findMany({
    where: { status: "DRAFT", startDate: { lte: today }, endDate: { gte: today } },
    include: leaseWithParties,
  })

  let activated = 0
  let skipped = 0

  for (const lease of leases) {
    // Never end up with two active leases on the same property
    if (await propertyHasOtherActiveLease(db, lease.propertyId, lease.id)) {
      skipped++
      continue
    }

    await db.$transaction([
      db.lease.update({ where: { id: lease.id }, data: { status: "ACTIVE" } }),
      db.property.update({ where: { id: lease.propertyId }, data: { status: "OCCUPIED" } }),
      db.notification.create({
        data: {
          userId: lease.tenantId,
          type: "LEASE_ACTIVATED",
          title: "Bail en vigueur",
          message: `Votre bail pour ${lease.property.name} est entré en vigueur le ${formatDay(lease.startDate)}.`,
          relatedId: lease.id,
          link: `/leases/${lease.id}`,
        },
      }),
      db.activity.create({
        data: {
          userId: lease.property.ownerId,
          action: "AUTO_ACTIVATE_LEASE",
          entityType: "LEASE",
          entityId: lease.id,
          details: `Bail activé automatiquement pour ${lease.property.name}`,
        },
      }),
    ])
    activated++
  }

  return { activated, skipped }
}

/** ACTIVE leases past their end date become EXPIRED (property becomes AVAILABLE). */
export async function expireEndedLeases(db: PrismaClient, now: Date) {
  const today = toUtcDay(now)
  const leases = await db.lease.findMany({
    where: { status: "ACTIVE", endDate: { lt: today } },
    include: leaseWithParties,
  })

  for (const lease of leases) {
    const keepOccupied = await propertyHasOtherActiveLease(db, lease.propertyId, lease.id)
    const message = `Le bail pour ${lease.property.name} a expiré le ${formatDay(lease.endDate)}.`

    await db.$transaction([
      db.lease.update({ where: { id: lease.id }, data: { status: "EXPIRED" } }),
      ...(keepOccupied
        ? []
        : [db.property.update({ where: { id: lease.propertyId }, data: { status: "AVAILABLE" } })]),
      db.notification.createMany({
        data: [lease.tenantId, ...landlordIds(lease.property)].map((userId) => ({
          userId,
          type: "LEASE_EXPIRED" as const,
          title: "Bail expiré",
          message,
          relatedId: lease.id,
          link: `/leases/${lease.id}`,
        })),
      }),
      db.activity.create({
        data: {
          userId: lease.property.ownerId,
          action: "AUTO_EXPIRE_LEASE",
          entityType: "LEASE",
          entityId: lease.id,
          details: `Bail expiré automatiquement pour ${lease.property.name}`,
        },
      }),
    ])
  }

  return { expired: leases.length }
}

/** PENDING payments whose due date has passed become OVERDUE; the tenant is notified. */
export async function markOverduePayments(db: PrismaClient, now: Date) {
  const today = toUtcDay(now)
  const payments = await db.payment.findMany({
    where: { status: "PENDING", dueDate: { lt: today } },
    select: {
      id: true,
      tenantId: true,
      amount: true,
      dueDate: true,
      lease: { select: { property: { select: { name: true } } } },
    },
  })

  if (payments.length === 0) return { overdue: 0 }

  const [{ count }] = await db.$transaction([
    // Status re-checked so a payment marked paid meanwhile is left alone
    db.payment.updateMany({
      where: { id: { in: payments.map((p) => p.id) }, status: "PENDING" },
      data: { status: "OVERDUE" },
    }),
    db.notification.createMany({
      data: payments.map((payment) => ({
        userId: payment.tenantId,
        type: "PAYMENT_DUE" as const,
        title: "Loyer en retard",
        message: `Le loyer de ${formatCurrency(payment.amount)} pour ${payment.lease.property.name}, dû le ${formatDay(payment.dueDate)}, n'a pas encore été réglé.`,
        relatedId: payment.id,
        link: `/payments/${payment.id}`,
      })),
    }),
  ])

  return { overdue: count }
}

/** Sends "lease ending soon" notices (60 then 30 days before the end), once each. */
export async function sendExpiryNotices(db: PrismaClient, now: Date) {
  const today = toUtcDay(now)
  const horizon = addUtcDays(today, Math.max(...EXPIRY_NOTICE_DAYS))
  const leases = await db.lease.findMany({
    where: {
      status: "ACTIVE",
      endDate: { gte: today },
      // Leases entering the notice window, or extended ones whose marker must be reset
      OR: [{ endDate: { lte: horizon } }, { lastExpiryNoticeDays: { not: null } }],
    },
    include: leaseWithParties,
  })

  let sent = 0
  let reset = 0

  for (const lease of leases) {
    const daysLeft = daysUntil(lease.endDate, today)
    const decision = decideExpiryNotice(daysLeft, lease.lastExpiryNoticeDays)

    if (decision.action === "reset") {
      await db.lease.update({ where: { id: lease.id }, data: { lastExpiryNoticeDays: null } })
      reset++
    } else if (decision.action === "send") {
      const message = `Le bail pour ${lease.property.name} se termine le ${formatDay(lease.endDate)} (dans ${daysLeft} jour${daysLeft > 1 ? "s" : ""}). Pensez à le renouveler ou à organiser la sortie.`
      await db.$transaction([
        db.lease.update({
          where: { id: lease.id },
          data: { lastExpiryNoticeDays: decision.noticeDays },
        }),
        db.notification.createMany({
          data: [lease.tenantId, ...landlordIds(lease.property)].map((userId) => ({
            userId,
            type: "LEASE_EXPIRING" as const,
            title: "Fin de bail proche",
            message,
            relatedId: lease.id,
            link: `/leases/${lease.id}`,
          })),
        }),
      ])
      sent++
    }
  }

  return { sent, reset }
}

export type LeaseStatusJobsReport = {
  ranAt: string
  activation?: Awaited<ReturnType<typeof activateStartedLeases>>
  expiration?: Awaited<ReturnType<typeof expireEndedLeases>>
  overduePayments?: Awaited<ReturnType<typeof markOverduePayments>>
  expiryNotices?: Awaited<ReturnType<typeof sendExpiryNotices>>
  errors: { job: string; message: string }[]
}

/** Runs every job in order; one failing job doesn't prevent the others. */
export async function runLeaseStatusJobs(
  db: PrismaClient,
  now: Date = new Date()
): Promise<LeaseStatusJobsReport> {
  const report: LeaseStatusJobsReport = { ranAt: now.toISOString(), errors: [] }

  const jobs = [
    ["activation", () => activateStartedLeases(db, now)],
    ["expiration", () => expireEndedLeases(db, now)],
    ["overduePayments", () => markOverduePayments(db, now)],
    ["expiryNotices", () => sendExpiryNotices(db, now)],
  ] as const

  for (const [name, job] of jobs) {
    try {
      // Each job writes its own key of the report
      ;(report as Record<string, unknown>)[name] = await job()
    } catch (error) {
      console.error(`Lease status job "${name}" failed:`, error)
      report.errors.push({
        job: name,
        message: error instanceof Error ? error.message : String(error),
      })
    }
  }

  return report
}
