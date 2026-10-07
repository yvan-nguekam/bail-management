/**
 * @jest-environment node
 */
import {
  computeDepositBalance,
  getDepositActionError,
  isDepositTransferred,
} from "@/lib/deposit"

describe("computeDepositBalance", () => {
  it("refunds the full deposit when there is no deduction", () => {
    expect(computeDepositBalance(300000, [])).toEqual({
      received: 300000,
      totalDeductions: 0,
      refundAmount: 300000,
      remainingDue: 0,
    })
  })

  it("subtracts deductions from the refund", () => {
    expect(computeDepositBalance(300000, [50000, 25000])).toEqual({
      received: 300000,
      totalDeductions: 75000,
      refundAmount: 225000,
      remainingDue: 0,
    })
  })

  it("refunds nothing when deductions equal the deposit", () => {
    const balance = computeDepositBalance(100000, [60000, 40000])
    expect(balance.refundAmount).toBe(0)
    expect(balance.remainingDue).toBe(0)
  })

  it("never refunds a negative amount and reports the excess as due by the tenant", () => {
    expect(computeDepositBalance(100000, [80000, 70000])).toEqual({
      received: 100000,
      totalDeductions: 150000,
      refundAmount: 0,
      remainingDue: 50000,
    })
  })

  it("rounds to whole FCFA and ignores negative inputs", () => {
    const balance = computeDepositBalance(100000.4, [10000.6, -5000])
    expect(balance.received).toBe(100000)
    expect(balance.totalDeductions).toBe(10001)
    expect(balance.refundAmount).toBe(89999)
  })
})

describe("getDepositActionError", () => {
  it("allows receiving a deposit not yet received", () => {
    expect(getDepositActionError("receive", { leaseStatus: "ACTIVE", depositStatus: "NOT_RECEIVED" })).toBeNull()
    expect(getDepositActionError("receive", { leaseStatus: "DRAFT", depositStatus: "NOT_RECEIVED" })).toBeNull()
  })

  it("refuses receiving twice", () => {
    expect(getDepositActionError("receive", { leaseStatus: "ACTIVE", depositStatus: "HELD" })).not.toBeNull()
  })

  it("only allows deductions once the deposit is held", () => {
    expect(getDepositActionError("addDeduction", { leaseStatus: "TERMINATED", depositStatus: "NOT_RECEIVED" })).not.toBeNull()
    expect(getDepositActionError("addDeduction", { leaseStatus: "TERMINATED", depositStatus: "HELD" })).toBeNull()
    expect(getDepositActionError("removeDeduction", { leaseStatus: "EXPIRED", depositStatus: "HELD" })).toBeNull()
  })

  it("only allows settlement at the end of the lease", () => {
    expect(getDepositActionError("settle", { leaseStatus: "ACTIVE", depositStatus: "HELD" })).not.toBeNull()
    expect(getDepositActionError("settle", { leaseStatus: "DRAFT", depositStatus: "HELD" })).not.toBeNull()
    expect(getDepositActionError("settle", { leaseStatus: "TERMINATED", depositStatus: "HELD" })).toBeNull()
    expect(getDepositActionError("settle", { leaseStatus: "EXPIRED", depositStatus: "HELD" })).toBeNull()
    expect(getDepositActionError("settle", { leaseStatus: "EXPIRED", depositStatus: "NOT_RECEIVED" })).not.toBeNull()
  })

  it("locks everything once settled", () => {
    for (const action of ["receive", "addDeduction", "removeDeduction", "settle"] as const) {
      expect(getDepositActionError(action, { leaseStatus: "TERMINATED", depositStatus: "SETTLED" })).not.toBeNull()
    }
  })

  it("locks a renewed lease whose deposit moved to the new lease", () => {
    for (const action of ["receive", "addDeduction", "removeDeduction", "settle"] as const) {
      expect(getDepositActionError(action, { leaseStatus: "RENEWED", depositStatus: "HELD" })).not.toBeNull()
    }
  })
})

describe("isDepositTransferred", () => {
  it("flags unsettled deposits of renewed leases", () => {
    expect(isDepositTransferred("RENEWED", "HELD")).toBe(true)
    expect(isDepositTransferred("RENEWED", "NOT_RECEIVED")).toBe(true)
    expect(isDepositTransferred("TERMINATED", "HELD")).toBe(false)
  })
})
