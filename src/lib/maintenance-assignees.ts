/**
 * Intervenants possibles d'une demande de maintenance : l'équipe du bien
 * (propriétaire, gestionnaire) et les administrateurs. Un bailleur ne peut
 * plus assigner (et donc donner accès à la demande et aux coordonnées du
 * locataire) un utilisateur quelconque de la plateforme.
 */

interface AssigneeCandidate {
  id: string
  role: string
}

interface PropertyStaff {
  ownerId: string
  managerId: string | null
}

export function isAllowedAssignee(
  assignee: AssigneeCandidate,
  property: PropertyStaff,
  currentAssigneeId: string | null = null
): boolean {
  if (assignee.role === "TENANT") return false
  // L'intervenant déjà assigné reste valide (données antérieures à cette règle)
  if (assignee.id === currentAssigneeId) return true
  if (assignee.role === "ADMIN") return true
  return assignee.id === property.ownerId || assignee.id === property.managerId
}

/** Identifiants proposés dans le sélecteur (sans doublon). */
export function staffAssigneeIds(
  property: PropertyStaff,
  caller: { id: string; role: string }
): string[] {
  const ids = [property.ownerId, property.managerId]
  if (caller.role === "ADMIN") ids.push(caller.id)
  return [...new Set(ids.filter((id): id is string => Boolean(id)))]
}
