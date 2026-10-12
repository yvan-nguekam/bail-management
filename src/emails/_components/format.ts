import { formatCurrency } from "../../lib/utils"

export { formatCurrency }

/** Date longue en français, en UTC (les échéances sont stockées à minuit UTC). */
export function formatEmailDate(value: Date | string): string {
  return new Date(value).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  })
}
