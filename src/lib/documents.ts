// Logique pure liée aux documents (types, tailles, type MIME, droits de suppression).
// Aucune dépendance à Prisma/Next ici pour rester testable unitairement.

export const DOCUMENT_TYPES = ["CONTRACT", "INVOICE", "RECEIPT", "REPORT", "OTHER"] as const
export type DocumentTypeValue = (typeof DOCUMENT_TYPES)[number]

export const documentTypeLabels: Record<DocumentTypeValue, string> = {
  CONTRACT: "Contrat",
  INVOICE: "Facture",
  RECEIPT: "Quittance",
  REPORT: "Rapport",
  OTHER: "Autre",
}

export function isDocumentType(value: unknown): value is DocumentTypeValue {
  return typeof value === "string" && (DOCUMENT_TYPES as readonly string[]).includes(value)
}

export function documentTypeLabel(type: string): string {
  return isDocumentType(type) ? documentTypeLabels[type] : type
}

/** "—" pour 0, puis o / Ko / Mo / Go avec une décimale au-delà du kilo-octet. */
export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "—"
  if (bytes < 1024) return `${bytes} o`
  const units = ["Ko", "Mo", "Go"]
  let value = bytes / 1024
  let unit = 0
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024
    unit += 1
  }
  const rounded = value < 10 ? value.toFixed(1).replace(".0", "") : Math.round(value).toString()
  return `${rounded.replace(".", ",")} ${units[unit]}`
}

const MIME_BY_EXTENSION: Record<string, string> = {
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  csv: "text/csv",
  txt: "text/plain",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  zip: "application/zip",
}

/** Devine le type MIME à partir de l'extension de l'URL (repli générique sinon). */
export function guessMimeType(url: string): string {
  let pathname = url
  try {
    pathname = new URL(url).pathname
  } catch {
    // URL relative ou invalide : on regarde la chaîne brute
  }
  const match = pathname.toLowerCase().match(/\.([a-z0-9]+)$/)
  const extension = match?.[1]
  return (extension && MIME_BY_EXTENSION[extension]) || "application/octet-stream"
}

export type DocumentIconKind = "pdf" | "image" | "sheet" | "text" | "archive" | "file"

/** Famille d'icône à afficher selon le type MIME. */
export function documentIconKind(mimeType: string): DocumentIconKind {
  const mime = mimeType.toLowerCase()
  if (mime === "application/pdf") return "pdf"
  if (mime.startsWith("image/")) return "image"
  if (mime.includes("spreadsheet") || mime.includes("excel") || mime === "text/csv") return "sheet"
  if (mime.startsWith("text/") || mime.includes("word") || mime.includes("document")) return "text"
  if (mime.includes("zip") || mime.includes("compressed")) return "archive"
  return "file"
}

interface AccessUser {
  id: string
  role: string
}

export interface DocumentAccessInfo {
  uploadedById: string
  property?: { ownerId: string; managerId: string | null } | null
  lease?: { property: { ownerId: string; managerId: string | null } } | null
}

/** Admin, auteur du dépôt, ou propriétaire / gestionnaire du bien rattaché (directement ou via le bail). */
export function canDeleteDocument(user: AccessUser, document: DocumentAccessInfo): boolean {
  if (user.role === "ADMIN") return true
  if (document.uploadedById === user.id) return true

  const property = document.property ?? document.lease?.property
  if (!property) return false
  return property.ownerId === user.id || property.managerId === user.id
}
