/**
 * @jest-environment node
 */
import {
  addUtcDays,
  generatePaymentSchedule,
  scheduleTotal,
} from "@/lib/payment-schedule"

const d = (iso: string) => new Date(`${iso}T00:00:00.000Z`)
const iso = (date: Date) => date.toISOString().slice(0, 10)

describe("generatePaymentSchedule", () => {
  it("generates one full payment per month for a 12-month lease", () => {
    const schedule = generatePaymentSchedule({
      startDate: d("2026-01-01"),
      endDate: d("2026-12-31"),
      monthlyRent: 150000,
      paymentDay: 5,
    })

    expect(schedule).toHaveLength(12)
    expect(schedule.every((p) => p.amount === 150000 && !p.isProrated)).toBe(true)
    expect(iso(schedule[0].dueDate)).toBe("2026-01-05")
    expect(iso(schedule[11].periodEnd)).toBe("2026-12-31")
    expect(scheduleTotal(schedule)).toBe(1800000)
  })

  it("prorates the first and last partial months", () => {
    const schedule = generatePaymentSchedule({
      startDate: d("2026-01-15"),
      endDate: d("2026-03-10"),
      monthlyRent: 310000,
      paymentDay: 1,
    })

    expect(schedule).toHaveLength(3)
    // January: 15 -> 31 = 17 days out of 31
    expect(schedule[0]).toMatchObject({ amount: 170000, isProrated: true })
    // Due on the lease start since it begins after the payment day
    expect(iso(schedule[0].dueDate)).toBe("2026-01-15")
    expect(schedule[1]).toMatchObject({ amount: 310000, isProrated: false })
    expect(iso(schedule[1].dueDate)).toBe("2026-02-01")
    // March: 1 -> 10 = 10 days out of 31
    expect(schedule[2]).toMatchObject({ amount: 100000, isProrated: true })
    expect(iso(schedule[2].periodEnd)).toBe("2026-03-10")
  })

  it("clamps the payment day to the month length", () => {
    const schedule = generatePaymentSchedule({
      startDate: d("2026-02-01"),
      endDate: d("2026-04-30"),
      monthlyRent: 100000,
      paymentDay: 31,
    })

    expect(schedule.map((p) => iso(p.dueDate))).toEqual([
      "2026-02-28",
      "2026-03-31",
      "2026-04-30",
    ])
  })

  it("never puts a due date after the end of a short last period", () => {
    const schedule = generatePaymentSchedule({
      startDate: d("2026-01-01"),
      endDate: d("2026-02-03"),
      monthlyRent: 280000,
      paymentDay: 10,
    })

    expect(iso(schedule[1].dueDate)).toBe("2026-02-01")
    expect(schedule[1].amount).toBe(30000) // 3 days out of 28
  })

  it("handles leap years and year boundaries", () => {
    const schedule = generatePaymentSchedule({
      startDate: d("2027-12-01"),
      endDate: d("2028-02-29"),
      monthlyRent: 90000,
      paymentDay: 1,
    })

    expect(schedule.map((p) => iso(p.periodStart))).toEqual([
      "2027-12-01",
      "2028-01-01",
      "2028-02-01",
    ])
    expect(schedule[2].isProrated).toBe(false)
  })

  it("ignores the time of day of the input dates", () => {
    const schedule = generatePaymentSchedule({
      startDate: new Date("2026-05-01T22:30:00.000Z"),
      endDate: new Date("2026-05-31T08:00:00.000Z"),
      monthlyRent: 50000,
      paymentDay: 1,
    })

    expect(schedule).toHaveLength(1)
    expect(schedule[0].amount).toBe(50000)
  })

  it("returns an empty schedule for invalid input", () => {
    const base = { monthlyRent: 1000, paymentDay: 1 }
    expect(generatePaymentSchedule({ ...base, startDate: d("2026-02-01"), endDate: d("2026-01-01") })).toEqual([])
    expect(generatePaymentSchedule({ ...base, startDate: new Date("nope"), endDate: d("2026-01-01") })).toEqual([])
    expect(
      generatePaymentSchedule({ startDate: d("2026-01-01"), endDate: d("2026-02-01"), monthlyRent: 0, paymentDay: 1 })
    ).toEqual([])
  })
})

describe("addUtcDays", () => {
  it("adds calendar days in UTC", () => {
    expect(iso(addUtcDays(d("2026-12-31"), 1))).toBe("2027-01-01")
  })
})
