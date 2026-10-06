/**
 * @jest-environment node
 */
import type { Prisma } from "@prisma/client"
import { syncLeaseSchedule } from "@/lib/lease-schedule"

const d = (iso: string) => new Date(`${iso}T00:00:00.000Z`)

interface FakePayment {
  id: string
  status: string
  periodStart: Date | null
  amount: number
}

// Minimal in-memory stand-in for the Prisma transaction client
function fakeTx(initial: FakePayment[]) {
  let payments = [...initial]
  let nextId = 1
  const tx = {
    payment: {
      findMany: jest.fn(async () => payments.filter((p) => p.periodStart !== null)),
      deleteMany: jest.fn(async ({ where }: { where: { id: { in: string[] } } }) => {
        payments = payments.filter((p) => !where.id.in.includes(p.id))
        return { count: where.id.in.length }
      }),
      createMany: jest.fn(async ({ data }: { data: Omit<FakePayment, "id">[] }) => {
        payments.push(...data.map((p) => ({ ...p, id: `new-${nextId++}` })))
        return { count: data.length }
      }),
    },
  }
  return { tx: tx as unknown as Prisma.TransactionClient, all: () => payments }
}

const lease = {
  id: "lease-1",
  tenantId: "tenant-1",
  startDate: d("2026-01-01"),
  endDate: d("2026-06-30"),
  monthlyRent: 100000,
  paymentDay: 5,
}

describe("syncLeaseSchedule", () => {
  it("creates the full schedule with OVERDUE for past due dates", async () => {
    const { tx, all } = fakeTx([])
    const result = await syncLeaseSchedule(tx, lease, d("2026-03-10"))

    expect(result).toEqual({ created: 6, deleted: 0, kept: 0 })
    expect(all().map((p) => p.status)).toEqual([
      "OVERDUE",
      "OVERDUE",
      "OVERDUE",
      "PENDING",
      "PENDING",
      "PENDING",
    ])
  })

  it("keeps paid/cancelled installments and recomputes the unpaid ones", async () => {
    const { tx, all } = fakeTx([
      { id: "jan", status: "PAID", periodStart: d("2026-01-01"), amount: 100000 },
      { id: "feb", status: "CANCELLED", periodStart: d("2026-02-01"), amount: 100000 },
      { id: "mar", status: "OVERDUE", periodStart: d("2026-03-01"), amount: 100000 },
      { id: "manual", status: "PENDING", periodStart: null, amount: 5000 },
    ])

    const result = await syncLeaseSchedule(
      tx,
      { ...lease, monthlyRent: 120000 },
      d("2026-01-01")
    )

    expect(result).toEqual({ created: 4, deleted: 1, kept: 2 })
    const ids = all().map((p) => p.id)
    expect(ids).toEqual(expect.arrayContaining(["jan", "feb", "manual"]))
    expect(ids).not.toContain("mar")
    expect(all().find((p) => p.id === "jan")?.amount).toBe(100000)
    expect(
      all()
        .filter((p) => p.id.startsWith("new-"))
        .every((p) => p.amount === 120000)
    ).toBe(true)
  })

  it("cuts the schedule at the termination date with a prorated last month", async () => {
    const { tx, all } = fakeTx([])
    await syncLeaseSchedule(tx, lease, d("2026-01-01"))

    await syncLeaseSchedule(tx, { ...lease, endDate: d("2026-03-15") }, d("2026-01-01"))

    const amounts = all().map((p) => p.amount)
    expect(amounts).toEqual([100000, 100000, 48387]) // March: 15/31 days
  })
})
