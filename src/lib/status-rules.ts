// Business rules for status changes made through the generic edit endpoints.
// Dedicated routes (terminate, renew, mark-paid) keep their own side effects.

export type LeaseStatus = "DRAFT" | "ACTIVE" | "EXPIRED" | "TERMINATED" | "RENEWED"
export type PaymentStatus = "PENDING" | "PAID" | "OVERDUE" | "CANCELLED"

export type RuleResult = { ok: true } | { ok: false; error: string }

const ok: RuleResult = { ok: true }
const fail = (error: string): RuleResult => ({ ok: false, error })

/** Statuses whose dates and financial terms are history and can no longer change. */
export const FROZEN_LEASE_STATUSES: readonly LeaseStatus[] = ["EXPIRED", "TERMINATED", "RENEWED"]

/** Status targets a lease edit form may offer, the current status included. */
export function allowedLeaseStatusTargets(from: LeaseStatus): LeaseStatus[] {
  switch (from) {
    case "DRAFT":
      return ["DRAFT", "ACTIVE"]
    case "ACTIVE":
      return ["ACTIVE", "EXPIRED"]
    default:
      return [from]
  }
}

export function checkLeaseStatusChange(
  from: LeaseStatus,
  to: LeaseStatus,
  context: { endDate: Date; today: Date }
): RuleResult {
  if (from === to) return ok
  if (to === "TERMINATED") return fail("Utilisez l'action « Résilier » pour mettre fin à un bail.")
  if (to === "RENEWED") return fail("Utilisez l'action « Renouveler » pour prolonger un bail.")
  if (!allowedLeaseStatusTargets(from).includes(to)) {
    return fail("Ce changement de statut n'est pas autorisé.")
  }
  if (from === "ACTIVE" && to === "EXPIRED" && context.endDate >= context.today) {
    return fail("Un bail ne peut expirer qu'après sa date de fin.")
  }
  return ok
}

export function checkLeaseTermsChange(status: LeaseStatus, termsChanged: boolean): RuleResult {
  if (termsChanged && FROZEN_LEASE_STATUSES.includes(status)) {
    return fail("Les dates et le loyer d'un bail terminé ne peuvent plus être modifiés.")
  }
  return ok
}

/** Fields of a payment that may still be corrected once it is paid or cancelled. */
const LOCKED_PAYMENT_EDITABLE_FIELDS: Record<"PAID" | "CANCELLED", readonly string[]> = {
  PAID: ["notes", "paymentMethod", "transactionId", "paidDate"],
  CANCELLED: ["notes"],
}

export function allowedPaymentStatusTargets(from: PaymentStatus): PaymentStatus[] {
  switch (from) {
    case "PENDING":
    case "OVERDUE":
      return ["PENDING", "OVERDUE", "PAID", "CANCELLED"]
    case "CANCELLED":
      // Reopening restores an unpaid installment; paying it goes through mark-paid afterwards
      return ["CANCELLED", "PENDING", "OVERDUE"]
    case "PAID":
      return ["PAID"]
  }
}

export function checkPaymentUpdate(
  from: PaymentStatus,
  changes: { status?: PaymentStatus; fields: string[] }
): RuleResult {
  const to = changes.status ?? from

  if (from !== to && !allowedPaymentStatusTargets(from).includes(to)) {
    return from === "PAID"
      ? fail("Un paiement encaissé ne peut plus changer de statut.")
      : fail("Ce changement de statut n'est pas autorisé.")
  }

  // Reopening a cancelled installment only changes its status (and notes)
  if (from === "CANCELLED" && to !== "CANCELLED") {
    const extra = changes.fields.filter((f) => !["status", "notes"].includes(f))
    return extra.length === 0 ? ok : fail("Rouvrez d'abord le paiement, puis modifiez-le.")
  }

  if (from === "PAID" || from === "CANCELLED") {
    const editable = LOCKED_PAYMENT_EDITABLE_FIELDS[from]
    const forbidden = changes.fields.filter((f) => f !== "status" && !editable.includes(f))
    if (forbidden.length > 0) {
      return fail(
        from === "PAID"
          ? "Le montant et l'échéance d'un paiement encaissé ne peuvent plus être modifiés."
          : "Un paiement annulé ne peut pas être modifié ; rouvrez-le d'abord."
      )
    }
  }

  return ok
}

export function checkMarkPaid(from: PaymentStatus): RuleResult {
  if (from === "PAID") return fail("Ce paiement est déjà marqué comme payé.")
  if (from === "CANCELLED") return fail("Un paiement annulé ne peut pas être encaissé ; rouvrez-le d'abord.")
  return ok
}

/** Status of a reopened installment, from its due date. */
export function reopenedPaymentStatus(dueDate: Date, today: Date): PaymentStatus {
  return dueDate < today ? "OVERDUE" : "PENDING"
}
