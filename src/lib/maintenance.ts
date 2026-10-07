// Logique pure liée aux demandes de maintenance (libellés, transitions de statut, RBAC).
// Aucune dépendance à Prisma/Next ici pour rester testable unitairement.

export const MAINTENANCE_STATUSES = [
  "OPEN",
  "IN_PROGRESS",
  "RESOLVED",
  "CLOSED",
  "CANCELLED",
] as const;
export type MaintenanceStatusValue = (typeof MAINTENANCE_STATUSES)[number];

export const MAINTENANCE_PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;
export type MaintenancePriorityValue = (typeof MAINTENANCE_PRIORITIES)[number];

export type UserRoleValue = "ADMIN" | "LANDLORD" | "MANAGER" | "TENANT";

type BadgeVariant = "default" | "secondary" | "destructive" | "outline";

export const maintenanceStatusLabels: Record<MaintenanceStatusValue, string> = {
  OPEN: "Ouverte",
  IN_PROGRESS: "En cours",
  RESOLVED: "Résolue",
  CLOSED: "Clôturée",
  CANCELLED: "Annulée",
};

export const maintenanceStatusVariants: Record<MaintenanceStatusValue, BadgeVariant> = {
  OPEN: "outline",
  IN_PROGRESS: "default",
  RESOLVED: "secondary",
  CLOSED: "secondary",
  CANCELLED: "destructive",
};

export const maintenancePriorityLabels: Record<MaintenancePriorityValue, string> = {
  LOW: "Basse",
  MEDIUM: "Moyenne",
  HIGH: "Haute",
  URGENT: "Urgente",
};

export const maintenancePriorityVariants: Record<MaintenancePriorityValue, BadgeVariant> = {
  LOW: "outline",
  MEDIUM: "secondary",
  HIGH: "default",
  URGENT: "destructive",
};

export const roleLabels: Record<UserRoleValue, string> = {
  ADMIN: "Administrateur",
  LANDLORD: "Propriétaire",
  MANAGER: "Gestionnaire",
  TENANT: "Locataire",
};

export const MAINTENANCE_CATEGORIES = [
  "Plomberie",
  "Électricité",
  "Chauffage / Climatisation",
  "Serrurerie",
  "Électroménager",
  "Toiture / Infiltrations",
  "Nuisibles",
  "Parties communes",
  "Autre",
] as const;

export function isMaintenanceStatus(value: unknown): value is MaintenanceStatusValue {
  return typeof value === "string" && (MAINTENANCE_STATUSES as readonly string[]).includes(value);
}

export function isMaintenancePriority(value: unknown): value is MaintenancePriorityValue {
  return (
    typeof value === "string" && (MAINTENANCE_PRIORITIES as readonly string[]).includes(value)
  );
}

/**
 * Transitions de statut autorisées.
 * - Une demande ouverte peut être prise en charge, résolue, annulée ou clôturée directement.
 * - Une demande résolue peut être clôturée ou réouverte.
 * - Une demande clôturée ou annulée peut seulement être réouverte.
 */
const STATUS_TRANSITIONS: Record<MaintenanceStatusValue, MaintenanceStatusValue[]> = {
  OPEN: ["IN_PROGRESS", "RESOLVED", "CLOSED", "CANCELLED"],
  IN_PROGRESS: ["OPEN", "RESOLVED", "CANCELLED"],
  RESOLVED: ["IN_PROGRESS", "CLOSED", "OPEN"],
  CLOSED: ["OPEN"],
  CANCELLED: ["OPEN"],
};

export function getAllowedNextStatuses(current: MaintenanceStatusValue): MaintenanceStatusValue[] {
  return STATUS_TRANSITIONS[current];
}

export function canTransitionStatus(
  from: MaintenanceStatusValue,
  to: MaintenanceStatusValue
): boolean {
  return from === to || STATUS_TRANSITIONS[from].includes(to);
}

/**
 * Calcule la nouvelle valeur de resolvedAt après un changement de statut.
 * - RESOLVED : conserve la date existante ou utilise `now`.
 * - CLOSED : conserve la date existante (une clôture sans résolution n'en crée pas).
 * - OPEN / IN_PROGRESS / CANCELLED : la demande n'est plus résolue, on efface la date.
 */
export function computeResolvedAt(
  newStatus: MaintenanceStatusValue,
  existingResolvedAt: Date | null,
  now: Date = new Date()
): Date | null {
  switch (newStatus) {
    case "RESOLVED":
      return existingResolvedAt ?? now;
    case "CLOSED":
      return existingResolvedAt;
    default:
      return null;
  }
}

/** Les rôles « gestion » (admin, propriétaire, gestionnaire) peuvent piloter une demande. */
export function isStaffRole(role: UserRoleValue): boolean {
  return role === "ADMIN" || role === "LANDLORD" || role === "MANAGER";
}

interface PropertyAccess {
  ownerId: string;
  managerId: string | null;
}

/** Un utilisateur peut-il gérer (modifier, créer pour autrui) les demandes de cette propriété ? */
export function canManageProperty(
  user: { id: string; role: UserRoleValue },
  property: PropertyAccess
): boolean {
  if (user.role === "ADMIN") return true;
  if (user.role === "TENANT") return false;
  return property.ownerId === user.id || property.managerId === user.id;
}

/**
 * Suppression : admin et propriétaire/gestionnaire du bien à tout moment ;
 * le demandeur uniquement tant que la demande est encore OPEN (pas encore prise en charge).
 */
export function canDeleteRequest(
  user: { id: string; role: UserRoleValue },
  request: { tenantId: string; status: MaintenanceStatusValue; property: PropertyAccess }
): boolean {
  if (canManageProperty(user, request.property)) return true;
  return request.tenantId === user.id && request.status === "OPEN";
}
