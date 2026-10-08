// Logique pure liée aux comptes utilisateurs (rôles, règles d'administration).
// Aucune dépendance à Prisma/Next ici pour rester testable unitairement.

export const USER_ROLES = ["ADMIN", "LANDLORD", "MANAGER", "TENANT"] as const
export type UserRoleValue = (typeof USER_ROLES)[number]

export const userRoleLabels: Record<UserRoleValue, string> = {
  ADMIN: "Administrateur",
  LANDLORD: "Propriétaire",
  MANAGER: "Gestionnaire",
  TENANT: "Locataire",
}

export function isUserRole(value: unknown): value is UserRoleValue {
  return typeof value === "string" && (USER_ROLES as readonly string[]).includes(value)
}

export function userRoleLabel(role: string): string {
  return isUserRole(role) ? userRoleLabels[role] : role
}

interface Actor {
  id: string
  role: string
}

/**
 * Seul un administrateur change les rôles, et jamais le sien
 * (pour ne pas se retirer l'accès admin par erreur).
 */
export function canChangeRole(actor: Actor, targetId: string): boolean {
  return actor.role === "ADMIN" && actor.id !== targetId
}

/** Initiales (2 lettres max) pour un avatar de repli. */
export function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()
}
