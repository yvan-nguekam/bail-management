/**
 * @jest-environment node
 */
import {
  isPaymentOverdue,
  summarizeTenant,
  tenantLeaseScope,
  tenantWhere,
  type SummaryLease,
} from "@/lib/tenants"

const d = (iso: string) => new Date(`${iso}T00:00:00.000Z`)
const NOW = new Date("2026-10-06T15:30:00.000Z")

function lease(overrides: Partial<SummaryLease> = {}): SummaryLease {
  return {
    id: "lease-1",
    status: "ACTIVE",
    startDate: d("2026-01-01"),
    endDate: d("2026-12-31"),
    monthlyRent: 100000,
    property: { id: "prop-1", name: "Villa Bonapriso" },
    payments: [],
    ...overrides,
  }
}

describe("tenantLeaseScope", () => {
  it("gives ADMIN every lease", () => {
    expect(tenantLeaseScope({ id: "a", role: "ADMIN" })).toEqual({})
  })

  it.each(["LANDLORD", "MANAGER"])("restricts %s to owned or managed properties", (role) => {
    expect(tenantLeaseScope({ id: "u1", role })).toEqual({
      property: { OR: [{ ownerId: "u1" }, { managerId: "u1" }] },
    })
  })

  it("denies TENANT", () => {
    expect(tenantLeaseScope({ id: "t", role: "TENANT" })).toBeNull()
  })
})

describe("tenantWhere", () => {
  const scope = { property: { OR: [{ ownerId: "u1" }, { managerId: "u1" }] } }

  it("always requires a lease in scope", () => {
    expect(tenantWhere(scope)).toEqual({ AND: [{ leases: { some: scope } }] })
  })

  it("filters active and former tenants within the scope", () => {
    const active = { AND: [scope, { status: "ACTIVE" }] }
    expect(tenantWhere(scope, { status: "active" }).AND).toContainEqual({
      leases: { some: active },
    })
    expect(tenantWhere(scope, { status: "former" }).AND).toContainEqual({
      leases: { none: active },
    })
    expect(tenantWhere(scope, { status: "all" }).AND).toHaveLength(1)
  })

  it("searches name or email case-insensitively and ignores blank searches", () => {
    expect(tenantWhere(scope, { search: "  dupont " }).AND).toContainEqual({
      OR: [
        { name: { contains: "dupont", mode: "insensitive" } },
        { email: { contains: "dupont", mode: "insensitive" } },
      ],
    })
    expect(tenantWhere(scope, { search: "   " }).AND).toHaveLength(1)
  })
})

describe("isPaymentOverdue", () => {
  const today = d("2026-10-06")
  const p = (status: string, due: string) => ({ id: "p", amount: 1, status, dueDate: d(due) })

  it("treats OVERDUE and past-due PENDING payments as late", () => {
    expect(isPaymentOverdue(p("OVERDUE", "2026-12-01"), today)).toBe(true)
    expect(isPaymentOverdue(p("PENDING", "2026-10-05"), today)).toBe(true)
  })

  it("does not flag payments due today or later, paid or cancelled", () => {
    expect(isPaymentOverdue(p("PENDING", "2026-10-06"), today)).toBe(false)
    expect(isPaymentOverdue(p("PAID", "2026-01-01"), today)).toBe(false)
    expect(isPaymentOverdue(p("CANCELLED", "2026-01-01"), today)).toBe(false)
  })
})

describe("summarizeTenant", () => {
  it("returns an empty summary for a tenant without payments", () => {
    expect(summarizeTenant([lease({ status: "EXPIRED" })], NOW)).toEqual({
      activeLease: null,
      leaseCount: 1,
      totalPaid: 0,
      overdueAmount: 0,
      overdueCount: 0,
      nextDuePayment: null,
    })
  })

  it("aggregates paid, overdue and next due payments across leases", () => {
    const summary = summarizeTenant(
      [
        lease({
          id: "old",
          status: "EXPIRED",
          startDate: d("2025-01-01"),
          payments: [
            { id: "o1", amount: 80000, status: "PAID", dueDate: d("2025-06-01") },
            { id: "o2", amount: 80000, status: "OVERDUE", dueDate: d("2025-12-01") },
          ],
        }),
        lease({
          payments: [
            { id: "a1", amount: 100000, status: "PAID", dueDate: d("2026-09-01") },
            { id: "a2", amount: 100000, status: "PENDING", dueDate: d("2026-10-01") },
            { id: "a4", amount: 100000, status: "PENDING", dueDate: d("2026-12-01") },
            { id: "a3", amount: 100000, status: "PENDING", dueDate: d("2026-11-01") },
            { id: "a5", amount: 100000, status: "CANCELLED", dueDate: d("2026-08-01") },
          ],
        }),
      ],
      NOW
    )

    expect(summary.leaseCount).toBe(2)
    expect(summary.totalPaid).toBe(180000)
    expect(summary.overdueAmount).toBe(180000)
    expect(summary.overdueCount).toBe(2)
    expect(summary.nextDuePayment).toEqual({
      id: "a3",
      leaseId: "lease-1",
      amount: 100000,
      dueDate: d("2026-11-01"),
    })
    expect(summary.activeLease).toEqual({
      id: "lease-1",
      propertyId: "prop-1",
      propertyName: "Villa Bonapriso",
      monthlyRent: 100000,
      endDate: d("2026-12-31"),
    })
  })

  it("picks the most recent active lease when several are active", () => {
    const summary = summarizeTenant(
      [
        lease({ id: "older", startDate: d("2025-01-01") }),
        lease({ id: "newer", startDate: d("2026-03-01"), property: { id: "p2", name: "Studio" } }),
      ],
      NOW
    )
    expect(summary.activeLease?.id).toBe("newer")
    expect(summary.activeLease?.propertyName).toBe("Studio")
  })
})
