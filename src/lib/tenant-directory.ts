import type { Prisma } from "@prisma/client"
import { normalizeEmail } from "@/lib/security-tokens"

/**
 * Annuaire des locataires pour le formulaire de bail, sans exposer tous les
 * locataires de la plateforme :
 * - « mes locataires » : bail (passé ou en cours) sur un bien que je possède / gère,
 *   ou compte créé à partir d'une invitation que j'ai envoyée ;
 * - recherche ponctuelle par e-mail EXACT (voir `parseLookupEmail`).
 */

/** Rôles autorisés à constituer un bail, donc à chercher / inviter des locataires. */
export function canManageTenants(role: string): boolean {
  return role === "LANDLORD" || role === "MANAGER" || role === "ADMIN"
}

/** Filtre Prisma du sélecteur : locataires du périmètre + invités ayant accepté. */
export function pickerTenantWhere(
  scope: Prisma.LeaseWhereInput,
  acceptedInviteEmails: string[]
): Prisma.UserWhereInput {
  const or: Prisma.UserWhereInput[] = [{ leases: { some: scope } }]
  if (acceptedInviteEmails.length > 0) {
    or.push({ email: { in: acceptedInviteEmails } })
  }
  return { role: "TENANT", OR: or }
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * Normalise l'e-mail saisi pour la recherche exacte. Renvoie null pour toute
 * saisie qui n'est pas une adresse complète (pas de recherche partielle,
 * pas de jokers) : on ne peut retrouver qu'un locataire dont on connaît déjà l'e-mail.
 */
export function parseLookupEmail(raw: string | null | undefined): string | null {
  if (typeof raw !== "string") return null
  const email = normalizeEmail(raw)
  if (email.length < 6 || email.length > 254) return null
  if (/[%*?]/.test(email)) return null
  return EMAIL_PATTERN.test(email) ? email : null
}

/** Seules informations renvoyées par la recherche : ni e-mail, ni téléphone. */
export function lookupResult(user: { id: string; name: string } | null) {
  return user ? { id: user.id, name: user.name } : null
}
