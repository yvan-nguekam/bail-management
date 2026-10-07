/**
 * @jest-environment node
 */
import type { PrismaClient } from "@prisma/client"
import {
  expireEndedLeases,
  markOverduePayments,
  runLeaseStatusJobs,
  sendExpiryNotices,
} from "@/lib/lease-status-jobs"

const d = (iso: string) => new Date(`${iso}T00:00:00.000Z`)

const property = { id: "prop-1", name: "Villa Bonapriso", ownerId: "owner-1", managerId: "manager-1" }

// Each model method is a jest mock; $transaction just awaits the queued operations
function fakeDb(overrides: Record<string, Record<string, jest.Mock>> = {}) {
  const model = () => ({
    findMany: jest.fn(async () => []),
    findFirst: jest.fn(async () => null),
    update: jest.fn(async () => ({})),
    updateMany: jest.fn(async () => ({ count: 0 })),
    create: jest.fn(async () => ({})),
    createMany: jest.fn(async () => ({ count: 0 })),
  })
  const db = {
    lease: { ...model(), ...overrides.lease },
    payment: { ...model(), ...overrides.payment },
    property: { ...model(), ...overrides.property },
    notification: { ...model(), ...overrides.notification },
    activity: { ...model(), ...overrides.activity },
    $transaction: jest.fn(async (ops: Promise<unknown>[]) => Promise.all(ops)),
  }
  return db as unknown as PrismaClient & typeof db
}

describe("markOverduePayments", () => {
  it("marks past PENDING payments OVERDUE and notifies tenants", async () => {
    const db = fakeDb({
      payment: {
        findMany: jest.fn(async () => [
          {
            id: "pay-1",
            tenantId: "tenant-1",
            amount: 150000,
            dueDate: d("2026-03-05"),
            lease: { property: { name: property.name } },
          },
        ]),
        updateMany: jest.fn(async () => ({ count: 1 })),
      },
    })

    const result = await markOverduePayments(db, new Date("2026-03-06T08:00:00.000Z"))

    expect(result).toEqual({ overdue: 1 })
    expect(db.payment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { status: "PENDING", dueDate: { lt: d("2026-03-06") } } })
    )
    expect(db.payment.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ["pay-1"] }, status: "PENDING" },
      data: { status: "OVERDUE" },
    })
    const [{ data }] = db.notification.createMany.mock.calls[0] as unknown as [
      { data: { userId: string; link: string }[] },
    ]
    expect(data).toEqual([expect.objectContaining({ userId: "tenant-1", link: "/payments/pay-1" })])
  })

  it("does nothing when no payment is late", async () => {
    const db = fakeDb()
    expect(await markOverduePayments(db, d("2026-03-06"))).toEqual({ overdue: 0 })
    expect(db.$transaction).not.toHaveBeenCalled()
  })
})

describe("expireEndedLeases", () => {
  const endedLease = {
    id: "lease-1",
    tenantId: "tenant-1",
    propertyId: property.id,
    endDate: d("2026-02-28"),
    property,
  }

  it("expires the lease, frees the property and notifies tenant, owner and manager", async () => {
    const db = fakeDb({ lease: { findMany: jest.fn(async () => [endedLease]) } })

    expect(await expireEndedLeases(db, d("2026-03-01"))).toEqual({ expired: 1 })
    expect(db.lease.update).toHaveBeenCalledWith({ where: { id: "lease-1" }, data: { status: "EXPIRED" } })
    expect(db.property.update).toHaveBeenCalledWith({
      where: { id: property.id },
      data: { status: "AVAILABLE" },
    })
    const [{ data }] = db.notification.createMany.mock.calls[0] as unknown as [{ data: { userId: string }[] }]
    expect(data.map((n) => n.userId)).toEqual(["tenant-1", "owner-1", "manager-1"])
  })

  it("keeps the property occupied when another lease is active on it", async () => {
    const db = fakeDb({
      lease: {
        findMany: jest.fn(async () => [endedLease]),
        findFirst: jest.fn(async () => ({ id: "lease-2" })),
      },
    })

    await expireEndedLeases(db, d("2026-03-01"))
    expect(db.property.update).not.toHaveBeenCalled()
  })
})

describe("sendExpiryNotices", () => {
  it("sends a notice once per threshold and resets extended leases", async () => {
    const db = fakeDb({
      lease: {
        findMany: jest.fn(async () => [
          // 30 days left, 60-day notice already sent -> 30-day notice
          { id: "a", tenantId: "t-a", endDate: d("2026-04-30"), lastExpiryNoticeDays: 60, property },
          // 30 days left, 30-day notice already sent -> nothing
          { id: "b", tenantId: "t-b", endDate: d("2026-04-30"), lastExpiryNoticeDays: 30, property },
          // extended far away -> reset marker
          { id: "c", tenantId: "t-c", endDate: d("2027-03-31"), lastExpiryNoticeDays: 30, property },
        ]),
      },
    })

    expect(await sendExpiryNotices(db, d("2026-03-31"))).toEqual({ sent: 1, reset: 1 })
    expect(db.lease.update).toHaveBeenCalledWith({ where: { id: "a" }, data: { lastExpiryNoticeDays: 30 } })
    expect(db.lease.update).toHaveBeenCalledWith({ where: { id: "c" }, data: { lastExpiryNoticeDays: null } })
    expect(db.notification.createMany).toHaveBeenCalledTimes(1)
  })
})

describe("runLeaseStatusJobs", () => {
  it("keeps running the other jobs when one fails", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {})
    const db = fakeDb({
      payment: { findMany: jest.fn(async () => Promise.reject(new Error("db down"))) },
    })

    const report = await runLeaseStatusJobs(db, d("2026-03-01"))

    expect(report.errors).toEqual([{ job: "overduePayments", message: "db down" }])
    expect(report.activation).toEqual({ activated: 0, skipped: 0 })
    expect(report.expiration).toEqual({ expired: 0 })
    expect(report.expiryNotices).toEqual({ sent: 0, reset: 0 })
  })
})
