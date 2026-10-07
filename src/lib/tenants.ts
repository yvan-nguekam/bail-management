import type { Prisma } from "@prisma/client"
import { toUtcDay } from "@/lib/payment-schedule"

export type TenantStatusFilter = "all" | "active" | "former"

interface ScopeUser {
  id: string
  role: string
}

/**
 * Leases the caller may see when managing tenants.
 * ADMIN: every lease. LANDLORD / MANAGER: leases of properties they own or manage.
 * Returns null for roles without access to tenant management (TENANT).
 */
export function tenantLeaseScope(user: ScopeUser): Prisma.LeaseWhereInput | null {
  if (user.role === "ADMIN") return {}
  if (user.role === "LANDLORD" || user.role === "MANAGER") {
    return {
      property: { OR: [{ ownerId: user.id }, { managerId: user.id }] },
    }
  }
  return null
}

/** Prisma filter selecting the users who have (had) at least one lease in scope. */
export function tenantWhere(
  scope: Prisma.LeaseWhereInput,
  options: { search?: string | null; status?: TenantStatusFilter } = {}
): Prisma.UserWhereInput {
  const and: Prisma.UserWhereInput[] = [{ leases: { some: scope } }]
  const activeInScope: Prisma.LeaseWhereInput = { AND: [scope, { status: "ACTIVE" }] }

  if (options.status === "active") and.push({ leases: { some: activeInScope } })
  if (options.status === "former") and.push({ leases: { none: activeInScope } })

  const search = options.search?.trim()
  if (search) {
    and.push({
      OR: [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ],
    })
  }

  return { AND: and }
}

export interface SummaryPayment {
  id: string
  amount: number
  status: string
  dueDate: Date
}

export interface SummaryLease {
  id: string
  status: string
  startDate: Date
  endDate: Date
  monthlyRent: number
  property: { id: string; name: string }
  payments: SummaryPayment[]
}

export interface TenantSummary {
  activeLease: {
    id: string
    propertyId: string
    propertyName: string
    monthlyRent: number
    endDate: Date
  } | null
  leaseCount: number
  totalPaid: number
  overdueAmount: number
  overdueCount: number
  nextDuePayment: { id: string; leaseId: string; amount: number; dueDate: Date } | null
}

/**
 * A payment is late when flagged OVERDUE, or still PENDING after its due date
 * (statuses are only refreshed when the schedule is synced).
 */
export function isPaymentOverdue(payment: SummaryPayment, today: Date): boolean {
  if (payment.status === "OVERDUE") return true
  return payment.status === "PENDING" && payment.dueDate < today
}

/** Aggregates a tenant's leases (already restricted to the caller's scope). */
export function summarizeTenant(leases: SummaryLease[], now: Date = new Date()): TenantSummary {
  const today = toUtcDay(now)

  const active = leases
    .filter((l) => l.status === "ACTIVE")
    .sort((a, b) => b.startDate.getTime() - a.startDate.getTime())[0]

  let totalPaid = 0
  let overdueAmount = 0
  let overdueCount = 0
  let nextDuePayment: TenantSummary["nextDuePayment"] = null

  for (const lease of leases) {
    for (const payment of lease.payments) {
      if (payment.status === "PAID") {
        totalPaid += payment.amount
      } else if (isPaymentOverdue(payment, today)) {
        overdueAmount += payment.amount
        overdueCount += 1
      } else if (payment.status === "PENDING") {
        if (!nextDuePayment || payment.dueDate < nextDuePayment.dueDate) {
          nextDuePayment = {
            id: payment.id,
            leaseId: lease.id,
            amount: payment.amount,
            dueDate: payment.dueDate,
          }
        }
      }
    }
  }

  return {
    activeLease: active
      ? {
          id: active.id,
          propertyId: active.property.id,
          propertyName: active.property.name,
          monthlyRent: active.monthlyRent,
          endDate: active.endDate,
        }
      : null,
    leaseCount: leases.length,
    totalPaid,
    overdueAmount,
    overdueCount,
    nextDuePayment,
  }
}
