import { createHash, randomBytes } from "crypto"

/** Durée de validité d'un lien de réinitialisation du mot de passe. */
export const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000
/** Durée de validité d'une invitation de locataire. */
export const INVITATION_TTL_MS = 7 * 24 * 60 * 60 * 1000

/** Longueur minimale d'un mot de passe (identique à l'inscription). */
export const MIN_PASSWORD_LENGTH = 8

/**
 * Hash SHA-256 (hex) d'un jeton. Seul ce hash est stocké en base : une fuite
 * de la table ne permet pas de reconstituer les liens envoyés par e-mail.
 * (Un hash rapide suffit : le jeton a 256 bits d'entropie, ce n'est pas un mot de passe.)
 */
export function hashToken(rawToken: string): string {
  return createHash("sha256").update(rawToken, "utf8").digest("hex")
}

/** Jeton aléatoire (32 octets, base64url) et son hash à stocker. */
export function generateToken(): { token: string; tokenHash: string } {
  const token = randomBytes(32).toString("base64url")
  return { token, tokenHash: hashToken(token) }
}

/** Forme attendue d'un jeton reçu (évite des requêtes inutiles en base). */
export function isWellFormedToken(value: unknown): value is string {
  return typeof value === "string" && /^[A-Za-z0-9_-]{43}$/.test(value)
}

export function expiresAt(ttlMs: number, now: Date = new Date()): Date {
  return new Date(now.getTime() + ttlMs)
}

export type TokenState = "valid" | "expired" | "used"

/** État d'un jeton à usage unique (réinitialisation ou invitation). */
export function tokenState(
  record: { expiresAt: Date; usedAt?: Date | null; acceptedAt?: Date | null },
  now: Date = new Date()
): TokenState {
  if (record.usedAt || record.acceptedAt) return "used"
  if (record.expiresAt.getTime() <= now.getTime()) return "expired"
  return "valid"
}

/** Normalisation unique des e-mails (inscription, connexion, recherche, invitation). */
export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase()
}

/**
 * Un JWT émis avant le dernier changement de mot de passe est révoqué.
 * `authTime` : instant de la connexion (ms) enregistré dans le jeton.
 */
export function isSessionRevoked(
  authTime: number | undefined,
  passwordChangedAt: Date | null | undefined
): boolean {
  if (!passwordChangedAt) return false
  if (typeof authTime !== "number" || !Number.isFinite(authTime)) return true
  return authTime < passwordChangedAt.getTime()
}

/** Base des liens envoyés par e-mail : jamais l'en-tête Host (empoisonnement de lien). */
export function appBaseUrl(): string {
  const url =
    process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
  return url.replace(/\/+$/, "")
}
