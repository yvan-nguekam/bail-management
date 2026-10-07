// Gestion de la caution (dépôt de garantie) : logique pure, sans accès base de données.
// Montants en FCFA entiers.

export type DepositStatusValue = "NOT_RECEIVED" | "HELD" | "SETTLED"
export type LeaseStatusValue = "DRAFT" | "ACTIVE" | "EXPIRED" | "TERMINATED" | "RENEWED"

export type DepositAction = "receive" | "addDeduction" | "removeDeduction" | "settle"

export interface DepositBalance {
  /** Montant de caution encaissé */
  received: number
  /** Total des retenues */
  totalDeductions: number
  /** Montant à restituer au locataire (jamais négatif) */
  refundAmount: number
  /** Excédent des retenues sur la caution, restant dû par le locataire */
  remainingDue: number
}

const toFcfa = (amount: number) => Math.round(amount)

/**
 * Calcule la restitution : caution encaissée − retenues.
 * Si les retenues dépassent la caution, la restitution est 0 et l'excédent est dû par le locataire.
 */
export function computeDepositBalance(
  received: number,
  deductionAmounts: number[]
): DepositBalance {
  const receivedFcfa = toFcfa(Math.max(0, received))
  const totalDeductions = toFcfa(
    deductionAmounts.reduce((sum, amount) => sum + Math.max(0, amount), 0)
  )
  const diff = receivedFcfa - totalDeductions

  return {
    received: receivedFcfa,
    totalDeductions,
    refundAmount: Math.max(0, diff),
    remainingDue: Math.max(0, -diff),
  }
}

/** Les baux dont la caution peut être restituée (bail terminé). */
export const SETTLEABLE_LEASE_STATUSES: LeaseStatusValue[] = ["TERMINATED", "EXPIRED"]

/**
 * Un bail renouvelé transfère sa caution au nouveau bail : elle n'est plus gérée sur l'ancien.
 */
export function isDepositTransferred(
  leaseStatus: LeaseStatusValue,
  depositStatus: DepositStatusValue
) {
  return leaseStatus === "RENEWED" && depositStatus !== "SETTLED"
}

/**
 * Vérifie qu'une action sur la caution est autorisée dans l'état actuel.
 * Retourne un message d'erreur (en français) ou null si l'action est permise.
 */
export function getDepositActionError(
  action: DepositAction,
  { leaseStatus, depositStatus }: { leaseStatus: LeaseStatusValue; depositStatus: DepositStatusValue }
): string | null {
  if (depositStatus === "SETTLED") {
    return "La caution a déjà été restituée : elle ne peut plus être modifiée"
  }

  if (leaseStatus === "RENEWED") {
    return "La caution de ce bail est gérée sur le bail renouvelé"
  }

  switch (action) {
    case "receive":
      return depositStatus === "NOT_RECEIVED" ? null : "La caution a déjà été reçue"
    case "addDeduction":
    case "removeDeduction":
      return depositStatus === "HELD"
        ? null
        : "Les retenues ne sont possibles qu'une fois la caution reçue"
    case "settle":
      if (depositStatus !== "HELD") {
        return "La caution doit avoir été reçue avant d'être restituée"
      }
      return SETTLEABLE_LEASE_STATUSES.includes(leaseStatus)
        ? null
        : "La caution ne peut être restituée qu'à la fin du bail (résilié ou expiré)"
  }
}
