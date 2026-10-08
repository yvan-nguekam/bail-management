const dateFormatter = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
})

/** 05 oct. 2026 */
export function formatDate(value: Date | string) {
  return dateFormatter.format(new Date(value))
}

/** Period label "oct. 2026" used by report charts and exports. */
export function formatMonth(value: Date | string) {
  return new Date(value).toLocaleString("fr-FR", { month: "short", year: "numeric" })
}

/** "Bonjour Jean" — first name only, to keep the header short. */
export function greeting(name?: string | null) {
  const first = name?.trim().split(" ")[0]
  return first ? `Bonjour ${first}` : "Bonjour"
}
