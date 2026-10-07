// Pure data shaping for the lease contract PDF (no jsPDF here, so it is unit-testable).
// Input is the lease as returned by GET /api/leases/[id]. Dates are stored at UTC midnight.

import { formatCurrency } from "@/lib/utils"

type DateLike = string | Date

interface ContractPerson {
  name: string | null
  email: string | null
  phone?: string | null
}

export interface LeaseContractInput {
  id: string
  startDate: DateLike
  endDate: DateLike
  monthlyRent: number
  securityDeposit: number
  paymentDay?: number | null
  terms?: string | null
  property: {
    name: string
    type: string
    address: string
    city: string
    postalCode?: string | null
    state?: string | null
    country?: string | null
    area?: number | null
    bedrooms?: number | null
    bathrooms?: number | null
    owner: ContractPerson
  }
  tenant: ContractPerson
  payments?: Array<{ amount: number; status: string }>
}

export interface ContractParty {
  name: string
  email: string
  phone: string
}

export interface LeaseContractData {
  reference: string
  generatedOn: string
  landlord: ContractParty
  tenant: ContractParty
  property: {
    name: string
    typeLabel: string
    addressLines: string[]
    details: Array<{ label: string; value: string }>
  }
  duration: {
    startDate: string
    endDate: string
    months: number
    days: number
    label: string
  }
  financial: {
    monthlyRent: string
    paymentDay: string
    securityDeposit: string
    installments: { count: number; total: string } | null
  }
  terms: string | null
  fileName: string
}

export const PROPERTY_TYPE_LABELS: Record<string, string> = {
  APARTMENT: "Appartement",
  HOUSE: "Maison",
  STUDIO: "Studio",
  COMMERCIAL: "Local commercial",
  OFFICE: "Bureau",
  OTHER: "Autre",
}

const NOT_PROVIDED = "Non renseigné"

// Characters jsPDF's standard fonts (WinAnsiEncoding) can render beyond Latin-1.
const WIN_ANSI_EXTRAS = "€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ"

/**
 * Makes a string safe for jsPDF's built-in fonts: special spaces (narrow no-break
 * space produced by fr-FR number formatting, no-break space, thin space...) become
 * plain spaces, a few common typographic characters are mapped to ASCII, and any
 * remaining character outside WinAnsi is replaced with "?".
 */
export function toPdfText(value: string): string {
  return value
    .replace(/\r\n?/g, "\n")
    .replace(/[\u00A0\u2000-\u200A\u202F\u205F\u3000]/g, " ")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/[\u2010-\u2012\u2212]/g, "-")
    .replace(/\u2032/g, "'")
    .replace(/\u2033/g, '"')
    .replace(/[^\n\u0020-\u007E\u00A1-\u00FF]/gu, (ch) =>
      WIN_ANSI_EXTRAS.includes(ch) ? ch : "?"
    )
}

export function formatContractAmount(amount: number): string {
  return toPdfText(formatCurrency(amount))
}

export function formatContractDate(date: DateLike): string {
  return toPdfText(
    new Date(date).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    })
  )
}

/**
 * Lease duration with an inclusive end date: 2026-01-01 -> 2026-12-31 is 12 months.
 * Returns whole months plus remaining days.
 */
export function leaseDuration(startDate: DateLike, endDate: DateLike): { months: number; days: number } {
  const start = new Date(startDate)
  const end = new Date(endDate)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) {
    return { months: 0, days: 0 }
  }

  // Exclusive end: the day after the last covered day
  const endExclusive = new Date(
    Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate() + 1)
  )
  const startDay = Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate())

  let months =
    (endExclusive.getUTCFullYear() - start.getUTCFullYear()) * 12 +
    (endExclusive.getUTCMonth() - start.getUTCMonth())

  const addMonths = (n: number) => {
    const year = start.getUTCFullYear()
    const month = start.getUTCMonth() + n
    // Clamp the day to the target month length (e.g. Jan 31 + 1 month -> Feb 28/29)
    const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate()
    return Date.UTC(year, month, Math.min(start.getUTCDate(), lastDay))
  }

  while (months > 0 && addMonths(months) > endExclusive.getTime()) {
    months--
  }

  const anchor = months > 0 ? addMonths(months) : startDay
  const days = Math.round((endExclusive.getTime() - anchor) / (24 * 60 * 60 * 1000))
  return { months, days }
}

export function formatDurationLabel(months: number, days: number): string {
  const parts: string[] = []
  if (months > 0) parts.push(`${months} mois`)
  if (days > 0) parts.push(`${days} jour${days > 1 ? "s" : ""}`)
  return parts.length > 0 ? parts.join(" et ") : "0 jour"
}

export function slugify(value: string): string {
  const slug = value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
  return slug || "bien"
}

function isoDay(date: DateLike): string {
  const d = new Date(date)
  return Number.isNaN(d.getTime()) ? "date-inconnue" : d.toISOString().slice(0, 10)
}

export function leaseContractFileName(propertyName: string, startDate: DateLike): string {
  return `contrat-bail-${slugify(propertyName)}-${isoDay(startDate)}.pdf`
}

function party(person: ContractPerson): ContractParty {
  const clean = (v: string | null | undefined) =>
    v && v.trim() ? toPdfText(v.trim()) : NOT_PROVIDED
  return { name: clean(person.name), email: clean(person.email), phone: clean(person.phone) }
}

export function buildLeaseContractData(
  lease: LeaseContractInput,
  now: Date = new Date()
): LeaseContractData {
  const { property } = lease

  const cityLine = [property.postalCode, property.city]
    .map((v) => v?.trim())
    .filter(Boolean)
    .join(" ")
  const addressLines = [property.address?.trim(), cityLine, property.state?.trim(), property.country?.trim()]
    .filter((v): v is string => !!v)
    .map(toPdfText)

  const details: Array<{ label: string; value: string }> = []
  if (property.area != null && property.area > 0) {
    details.push({ label: "Superficie", value: `${toPdfText(property.area.toLocaleString("fr-FR"))} m²` })
  }
  if (property.bedrooms != null && property.bedrooms > 0) {
    details.push({ label: "Chambres", value: String(property.bedrooms) })
  }
  if (property.bathrooms != null && property.bathrooms > 0) {
    details.push({ label: "Salles de bain", value: String(property.bathrooms) })
  }

  const { months, days } = leaseDuration(lease.startDate, lease.endDate)

  const billed = (lease.payments ?? []).filter((p) => p.status !== "CANCELLED")
  const installments =
    billed.length > 0
      ? {
          count: billed.length,
          total: formatContractAmount(billed.reduce((sum, p) => sum + p.amount, 0)),
        }
      : null

  const paymentDay = Math.min(Math.max(Math.trunc(lease.paymentDay ?? 1) || 1, 1), 31)

  const terms = lease.terms?.trim() ? toPdfText(lease.terms.trim()) : null

  return {
    reference: toPdfText(lease.id),
    generatedOn: toPdfText(
      now.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })
    ),
    landlord: party(property.owner),
    tenant: party(lease.tenant),
    property: {
      name: toPdfText(property.name),
      typeLabel: PROPERTY_TYPE_LABELS[property.type] ?? toPdfText(property.type),
      addressLines,
      details,
    },
    duration: {
      startDate: formatContractDate(lease.startDate),
      endDate: formatContractDate(lease.endDate),
      months,
      days,
      label: formatDurationLabel(months, days),
    },
    financial: {
      monthlyRent: formatContractAmount(lease.monthlyRent),
      paymentDay: paymentDay === 1 ? "le 1er de chaque mois" : `le ${paymentDay} de chaque mois`,
      securityDeposit: formatContractAmount(lease.securityDeposit),
      installments,
    },
    terms,
    fileName: leaseContractFileName(property.name, lease.startDate),
  }
}
