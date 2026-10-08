/** Libellés et utilitaires partagés par les pages Paiements. */

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  CASH: "Espèces",
  BANK_TRANSFER: "Virement bancaire",
  CREDIT_CARD: "Carte de crédit",
  CHECK: "Chèque",
  MOBILE_MONEY: "Mobile Money",
};

export function paymentMethodLabel(method: string | null | undefined) {
  if (!method) return null;
  return PAYMENT_METHOD_LABELS[method] ?? method;
}

export function formatDate(date: string) {
  return new Date(date).toLocaleDateString("fr-FR", { timeZone: "UTC" });
}

/** Jours écoulés depuis l'échéance (négatif si elle est à venir). */
export function getDaysOverdue(dueDate: string) {
  return Math.ceil(
    (new Date().getTime() - new Date(dueDate).getTime()) / (1000 * 60 * 60 * 24)
  );
}

export function overdueLabel(days: number) {
  return `${days} jour${days > 1 ? "s" : ""} de retard`;
}
