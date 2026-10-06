import type { Prisma } from "@prisma/client"
import { generatePaymentSchedule, toUtcDay } from "@/lib/payment-schedule"

type Tx = Prisma.TransactionClient

interface LeaseScheduleSource {
  id: string
  tenantId: string
  startDate: Date
  endDate: Date
  monthlyRent: number
  paymentDay: number
}

export interface ScheduleSyncResult {
  created: number
  deleted: number
  kept: number
}

// Paid or cancelled installments are history: a sync never touches them
const LOCKED_STATUSES = ["PAID", "CANCELLED"] as const

/**
 * Makes the lease's generated payments match its current terms.
 * Unpaid generated installments are recomputed; paid/cancelled ones and
 * manually created payments (no period) are kept as they are.
 */
export async function syncLeaseSchedule(
  tx: Tx,
  lease: LeaseScheduleSource,
  now: Date = new Date()
): Promise<ScheduleSyncResult> {
  const existing = await tx.payment.findMany({
    where: { leaseId: lease.id, periodStart: { not: null } },
    select: { id: true, status: true, periodStart: true },
  })

  const locked = existing.filter((p) =>
    (LOCKED_STATUSES as readonly string[]).includes(p.status)
  )
  const lockedPeriods = new Set(locked.map((p) => p.periodStart!.getTime()))
  const toDelete = existing.filter((p) => !lockedPeriods.has(p.periodStart!.getTime()))

  if (toDelete.length > 0) {
    await tx.payment.deleteMany({ where: { id: { in: toDelete.map((p) => p.id) } } })
  }

  const today = toUtcDay(now)
  const schedule = generatePaymentSchedule(lease).filter(
    (p) => !lockedPeriods.has(p.periodStart.getTime())
  )

  if (schedule.length > 0) {
    await tx.payment.createMany({
      data: schedule.map((p) => ({
        leaseId: lease.id,
        tenantId: lease.tenantId,
        amount: p.amount,
        dueDate: p.dueDate,
        periodStart: p.periodStart,
        periodEnd: p.periodEnd,
        status: p.dueDate < today ? "OVERDUE" : "PENDING",
      })),
    })
  }

  return { created: schedule.length, deleted: toDelete.length, kept: locked.length }
}
