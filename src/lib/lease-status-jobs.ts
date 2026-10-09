import type { PrismaClient } from "@prisma/client"
import { addUtcDays, toUtcDay } from "@/lib/payment-schedule"
import { EXPIRY_NOTICE_DAYS, daysUntil, decideExpiryNotice } from "@/lib/lease-automation"
import { formatCurrency } from "@/lib/utils"
import { buildNotificationRows, sendNotificationEmails, type NotifyInput } from "@/lib/notify"
import { absoluteUrl, buildEmailSubject } from "@/lib/notification-preferences"
import { LeaseUpdateEmail } from "@/emails/lease-update"
import { LeaseExpiredEmail } from "@/emails/lease-expired"
import { LeaseExpiringEmail } from "@/emails/lease-expiring"
import { PaymentOverdueEmail } from "@/emails/payment-overdue"

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

// In-app notifications are written inside each job's transaction; emails are sent once it
// has committed, so a slow or failing email never blocks a status change (never throws).
async function emailRecipients(db: PrismaClient, notification: NotifyInput) {
  await sendNotificationEmails(db, {
    userIds: buildNotificationRows(notification).map((row) => row.userId),
    type: notification.type,
    email: notification.email,
  })
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

    const notification: NotifyInput = {
      userId: lease.tenantId,
      type: "LEASE_ACTIVATED",
      title: "Bail en vigueur",
      message: `Votre bail pour ${lease.property.name} est entré en vigueur le ${formatDay(lease.startDate)}.`,
      relatedId: lease.id,
      link: `/leases/${lease.id}`,
      email: {
        subject: buildEmailSubject("Bail en vigueur", lease.property.name),
        react: (recipient) =>
          LeaseUpdateEmail({
            kind: "activated",
            recipientName: recipient.name,
            propertyName: lease.property.name,
            startDate: lease.startDate,
            endDate: lease.endDate,
            monthlyRent: lease.monthlyRent,
            leaseUrl: absoluteUrl(`/leases/${lease.id}`),
          }),
      },
    }

    await db.$transaction([
      db.lease.update({ where: { id: lease.id }, data: { status: "ACTIVE" } }),
      db.property.update({ where: { id: lease.propertyId }, data: { status: "OCCUPIED" } }),
      db.notification.createMany({ data: buildNotificationRows(notification) }),
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
    await emailRecipients(db, notification)
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
    const notification: NotifyInput = {
      userIds: [lease.tenantId, ...landlordIds(lease.property)],
      type: "LEASE_EXPIRED",
      title: "Bail expiré",
      message: `Le bail pour ${lease.property.name} a expiré le ${formatDay(lease.endDate)}.`,
      relatedId: lease.id,
      link: `/leases/${lease.id}`,
      email: {
        subject: buildEmailSubject("Bail expiré", lease.property.name),
        react: (recipient) =>
          LeaseExpiredEmail({
            recipientName: recipient.name,
            propertyName: lease.property.name,
            endDate: lease.endDate,
            isTenant: recipient.id === lease.tenantId,
            leaseUrl: absoluteUrl(`/leases/${lease.id}`),
          }),
      },
    }

    await db.$transaction([
      db.lease.update({ where: { id: lease.id }, data: { status: "EXPIRED" } }),
      ...(keepOccupied
        ? []
        : [db.property.update({ where: { id: lease.propertyId }, data: { status: "AVAILABLE" } })]),
      db.notification.createMany({ data: buildNotificationRows(notification) }),
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
    await emailRecipients(db, notification)
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

  const notifications: NotifyInput[] = payments.map((payment) => ({
    userId: payment.tenantId,
    type: "PAYMENT_DUE",
    title: "Loyer en retard",
    message: `Le loyer de ${formatCurrency(payment.amount)} pour ${payment.lease.property.name}, dû le ${formatDay(payment.dueDate)}, n'a pas encore été réglé.`,
    relatedId: payment.id,
    link: `/payments/${payment.id}`,
    email: {
      subject: buildEmailSubject("Loyer en retard", payment.lease.property.name),
      react: (recipient) =>
        PaymentOverdueEmail({
          tenantName: recipient.name,
          propertyName: payment.lease.property.name,
          amount: payment.amount,
          dueDate: payment.dueDate,
          paymentUrl: absoluteUrl(`/payments/${payment.id}`),
        }),
    },
  }))

  const [{ count }] = await db.$transaction([
    // Status re-checked so a payment marked paid meanwhile is left alone
    db.payment.updateMany({
      where: { id: { in: payments.map((p) => p.id) }, status: "PENDING" },
      data: { status: "OVERDUE" },
    }),
    db.notification.createMany({ data: notifications.flatMap(buildNotificationRows) }),
  ])

  for (const notification of notifications) {
    await emailRecipients(db, notification)
  }

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
      const days = `${daysLeft} jour${daysLeft > 1 ? "s" : ""}`
      const notification: NotifyInput = {
        userIds: [lease.tenantId, ...landlordIds(lease.property)],
        type: "LEASE_EXPIRING",
        title: "Fin de bail proche",
        message: `Le bail pour ${lease.property.name} se termine le ${formatDay(lease.endDate)} (dans ${days}). Pensez à le renouveler ou à organiser la sortie.`,
        relatedId: lease.id,
        link: `/leases/${lease.id}`,
        email: {
          subject: buildEmailSubject(`Fin de bail dans ${days}`, lease.property.name),
          react: (recipient) =>
            LeaseExpiringEmail({
              recipientName: recipient.name,
              propertyName: lease.property.name,
              endDate: lease.endDate,
              daysLeft,
              isTenant: recipient.id === lease.tenantId,
              leaseUrl: absoluteUrl(`/leases/${lease.id}`),
            }),
        },
      }

      await db.$transaction([
        db.lease.update({
          where: { id: lease.id },
          data: { lastExpiryNoticeDays: decision.noticeDays },
        }),
        db.notification.createMany({ data: buildNotificationRows(notification) }),
      ])
      await emailRecipients(db, notification)
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
