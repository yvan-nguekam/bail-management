/**
 * @jest-environment node
 */
import {
  allowedLeaseStatusTargets,
  allowedPaymentStatusTargets,
  checkLeaseStatusChange,
  checkLeaseTermsChange,
  checkMarkPaid,
  checkPaymentUpdate,
  reopenedPaymentStatus,
} from "@/lib/status-rules"

const d = (iso: string) => new Date(`${iso}T00:00:00.000Z`)
const ctx = { endDate: d("2026-12-31"), today: d("2026-10-12") }

describe("lease status rules", () => {
  it("lets a draft be activated and keeps same-status edits", () => {
    expect(checkLeaseStatusChange("DRAFT", "ACTIVE", ctx)).toEqual({ ok: true })
    expect(checkLeaseStatusChange("TERMINATED", "TERMINATED", ctx)).toEqual({ ok: true })
  })

  it("routes termination and renewal to their dedicated actions", () => {
    expect(checkLeaseStatusChange("ACTIVE", "TERMINATED", ctx)).toMatchObject({ ok: false, error: expect.stringContaining("Résilier") })
    expect(checkLeaseStatusChange("ACTIVE", "RENEWED", ctx)).toMatchObject({ ok: false, error: expect.stringContaining("Renouveler") })
  })

  it("only expires a lease after its end date", () => {
    expect(checkLeaseStatusChange("ACTIVE", "EXPIRED", ctx).ok).toBe(false)
    expect(checkLeaseStatusChange("ACTIVE", "EXPIRED", { ...ctx, endDate: d("2026-09-30") }).ok).toBe(true)
  })

  it("never reopens a finished lease", () => {
    for (const from of ["EXPIRED", "TERMINATED", "RENEWED"] as const) {
      expect(checkLeaseStatusChange(from, "ACTIVE", ctx).ok).toBe(false)
      expect(allowedLeaseStatusTargets(from)).toEqual([from])
    }
    expect(checkLeaseStatusChange("ACTIVE", "DRAFT", ctx).ok).toBe(false)
  })

  it("freezes dates and rent of finished leases", () => {
    expect(checkLeaseTermsChange("TERMINATED", true).ok).toBe(false)
    expect(checkLeaseTermsChange("TERMINATED", false).ok).toBe(true)
    expect(checkLeaseTermsChange("ACTIVE", true).ok).toBe(true)
  })
})

describe("payment rules", () => {
  it("locks a paid payment except for its receipt details", () => {
    expect(checkPaymentUpdate("PAID", { status: "PENDING", fields: ["status"] }).ok).toBe(false)
    expect(checkPaymentUpdate("PAID", { fields: ["amount"] }).ok).toBe(false)
    expect(checkPaymentUpdate("PAID", { fields: ["dueDate"] }).ok).toBe(false)
    expect(checkPaymentUpdate("PAID", { fields: ["notes", "transactionId", "paymentMethod", "paidDate"] }).ok).toBe(true)
    expect(allowedPaymentStatusTargets("PAID")).toEqual(["PAID"])
  })

  it("keeps a cancelled payment cancelled until reopened", () => {
    expect(checkPaymentUpdate("CANCELLED", { status: "PAID", fields: ["status"] }).ok).toBe(false)
    expect(checkPaymentUpdate("CANCELLED", { fields: ["amount"] }).ok).toBe(false)
    expect(checkPaymentUpdate("CANCELLED", { fields: ["notes"] }).ok).toBe(true)
    expect(checkPaymentUpdate("CANCELLED", { status: "PENDING", fields: ["status", "notes"] }).ok).toBe(true)
    expect(checkPaymentUpdate("CANCELLED", { status: "PENDING", fields: ["status", "amount"] }).ok).toBe(false)
  })

  it("lets unpaid payments be edited, paid or cancelled", () => {
    expect(checkPaymentUpdate("PENDING", { status: "PAID", fields: ["status", "paidDate"] }).ok).toBe(true)
    expect(checkPaymentUpdate("OVERDUE", { status: "CANCELLED", fields: ["status"] }).ok).toBe(true)
    expect(checkPaymentUpdate("PENDING", { fields: ["amount", "dueDate"] }).ok).toBe(true)
  })

  it("only marks unpaid, non-cancelled payments as paid", () => {
    expect(checkMarkPaid("PENDING").ok).toBe(true)
    expect(checkMarkPaid("OVERDUE").ok).toBe(true)
    expect(checkMarkPaid("PAID").ok).toBe(false)
    expect(checkMarkPaid("CANCELLED").ok).toBe(false)
  })

  it("reopens to OVERDUE or PENDING from the due date", () => {
    expect(reopenedPaymentStatus(d("2026-10-05"), d("2026-10-12"))).toBe("OVERDUE")
    expect(reopenedPaymentStatus(d("2026-11-05"), d("2026-10-12"))).toBe("PENDING")
  })
})
