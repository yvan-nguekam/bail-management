// Limites et types acceptés des envois de fichiers (Uploadthing).
// Partagé entre le FileRouter (serveur) et les composants d'envoi (client) :
// aucune dépendance à Prisma, Next ou Uploadthing ici.

export type UploadEndpoint = "propertyImage" | "document" | "maintenanceImage" | "avatar"

const MB = 1024 * 1024

export const IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
] as const

export const DOCUMENT_MIME_TYPES = [
  "application/pdf",
  ...IMAGE_MIME_TYPES,
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.oasis.opendocument.text",
  "application/vnd.oasis.opendocument.spreadsheet",
  "text/plain",
  "text/csv",
] as const

export interface UploadLimits {
  /** Taille maximale par fichier, en octets */
  maxFileSize: number
  /** Nombre maximal de fichiers par envoi */
  maxFileCount: number
  /** Types MIME acceptés */
  accept: readonly string[]
  /** Description lisible des formats acceptés */
  formatsLabel: string
}

const IMAGE_FORMATS = "JPG, PNG, WebP, GIF, AVIF"

export const UPLOAD_LIMITS: Record<UploadEndpoint, UploadLimits> = {
  propertyImage: {
    maxFileSize: 4 * MB,
    maxFileCount: 10,
    accept: IMAGE_MIME_TYPES,
    formatsLabel: IMAGE_FORMATS,
  },
  document: {
    maxFileSize: 16 * MB,
    maxFileCount: 1,
    accept: DOCUMENT_MIME_TYPES,
    formatsLabel: "PDF, images, Word, Excel, OpenDocument, texte",
  },
  maintenanceImage: {
    maxFileSize: 4 * MB,
    maxFileCount: 5,
    accept: IMAGE_MIME_TYPES,
    formatsLabel: IMAGE_FORMATS,
  },
  avatar: {
    maxFileSize: 2 * MB,
    maxFileCount: 1,
    accept: IMAGE_MIME_TYPES,
    formatsLabel: IMAGE_FORMATS,
  },
}

/** Nombre maximal de photos conservées sur un bien / une demande d'intervention. */
export const MAX_PROPERTY_IMAGES = 20
export const MAX_MAINTENANCE_IMAGES = 20

/**
 * Envoi de fichiers activé côté client.
 * NEXT_PUBLIC_UPLOAD_ENABLED est calculé dans next.config.ts à partir de la présence de
 * UPLOADTHING_TOKEN (au moment du build), sauf s'il est défini explicitement.
 */
export function isUploadEnabled(): boolean {
  return process.env.NEXT_PUBLIC_UPLOAD_ENABLED === "true"
}

/** "4 Mo" à partir d'un nombre d'octets (limites affichées). */
export function formatLimit(bytes: number): string {
  return `${Math.round(bytes / MB)} Mo`
}

/** Résumé affiché sous une zone de dépôt : formats, taille et nombre. */
export function describeLimits(endpoint: UploadEndpoint): string {
  const limits = UPLOAD_LIMITS[endpoint]
  const count =
    limits.maxFileCount === 1 ? "1 fichier" : `jusqu'à ${limits.maxFileCount} fichiers`
  return `${limits.formatsLabel} · ${formatLimit(limits.maxFileSize)} max · ${count}`
}

/**
 * Validation côté client avant tout envoi (le serveur revérifie).
 * Renvoie un message en français, ou null si le lot est valide.
 */
export function validateFiles(endpoint: UploadEndpoint, files: File[]): string | null {
  const limits = UPLOAD_LIMITS[endpoint]
  if (files.length === 0) return "Aucun fichier sélectionné."
  if (files.length > limits.maxFileCount) {
    return limits.maxFileCount === 1
      ? "Un seul fichier à la fois."
      : `${limits.maxFileCount} fichiers maximum par envoi.`
  }
  for (const file of files) {
    if (!limits.accept.includes(file.type)) {
      return `« ${file.name} » : format non accepté (${limits.formatsLabel}).`
    }
    if (file.size > limits.maxFileSize) {
      return `« ${file.name} » dépasse ${formatLimit(limits.maxFileSize)}.`
    }
  }
  return null
}

const UPLOADTHING_HOSTS = [/^utfs\.io$/, /\.ufs\.sh$/]

/** Clé Uploadthing d'une URL de fichier (https://<app>.ufs.sh/f/<clé> ou https://utfs.io/f/<clé>), sinon null. */
export function uploadthingKeyFromUrl(url: string): string | null {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return null
  }
  if (parsed.protocol !== "https:") return null
  if (!UPLOADTHING_HOSTS.some((host) => host.test(parsed.hostname))) return null
  const match = parsed.pathname.match(/^\/f\/([^/]+)$/)
  return match ? decodeURIComponent(match[1]) : null
}
