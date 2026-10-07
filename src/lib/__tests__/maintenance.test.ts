/** @jest-environment node */
import {
  MAINTENANCE_PRIORITIES,
  MAINTENANCE_STATUSES,
  canDeleteRequest,
  canManageProperty,
  canTransitionStatus,
  computeResolvedAt,
  getAllowedNextStatuses,
  isMaintenancePriority,
  isMaintenanceStatus,
  isStaffRole,
  maintenancePriorityLabels,
  maintenanceStatusLabels,
} from "../maintenance";

describe("libellés", () => {
  it("a un libellé français pour chaque statut et priorité", () => {
    for (const s of MAINTENANCE_STATUSES) expect(maintenanceStatusLabels[s]).toBeTruthy();
    for (const p of MAINTENANCE_PRIORITIES) expect(maintenancePriorityLabels[p]).toBeTruthy();
    expect(maintenanceStatusLabels.IN_PROGRESS).toBe("En cours");
    expect(maintenancePriorityLabels.URGENT).toBe("Urgente");
  });
});

describe("garde-fous de type", () => {
  it("reconnaît les statuts et priorités valides", () => {
    expect(isMaintenanceStatus("OPEN")).toBe(true);
    expect(isMaintenanceStatus("open")).toBe(false);
    expect(isMaintenanceStatus(null)).toBe(false);
    expect(isMaintenancePriority("HIGH")).toBe(true);
    expect(isMaintenancePriority("CRITICAL")).toBe(false);
  });
});

describe("transitions de statut", () => {
  it("autorise la prise en charge puis la résolution", () => {
    expect(canTransitionStatus("OPEN", "IN_PROGRESS")).toBe(true);
    expect(canTransitionStatus("IN_PROGRESS", "RESOLVED")).toBe(true);
    expect(canTransitionStatus("RESOLVED", "CLOSED")).toBe(true);
  });

  it("autorise de conserver le même statut", () => {
    for (const s of MAINTENANCE_STATUSES) expect(canTransitionStatus(s, s)).toBe(true);
  });

  it("n'autorise que la réouverture depuis CLOSED ou CANCELLED", () => {
    expect(getAllowedNextStatuses("CLOSED")).toEqual(["OPEN"]);
    expect(getAllowedNextStatuses("CANCELLED")).toEqual(["OPEN"]);
    expect(canTransitionStatus("CLOSED", "RESOLVED")).toBe(false);
    expect(canTransitionStatus("CANCELLED", "IN_PROGRESS")).toBe(false);
  });

  it("interdit de clôturer une demande en cours sans résolution", () => {
    expect(canTransitionStatus("IN_PROGRESS", "CLOSED")).toBe(false);
  });
});

describe("computeResolvedAt", () => {
  const now = new Date("2026-10-06T10:00:00Z");
  const earlier = new Date("2026-10-01T10:00:00Z");

  it("date la résolution si elle ne l'était pas", () => {
    expect(computeResolvedAt("RESOLVED", null, now)).toEqual(now);
  });

  it("conserve une date de résolution existante", () => {
    expect(computeResolvedAt("RESOLVED", earlier, now)).toEqual(earlier);
    expect(computeResolvedAt("CLOSED", earlier, now)).toEqual(earlier);
  });

  it("ne crée pas de date pour une clôture sans résolution", () => {
    expect(computeResolvedAt("CLOSED", null, now)).toBeNull();
  });

  it("efface la date lors d'une réouverture ou annulation", () => {
    expect(computeResolvedAt("OPEN", earlier, now)).toBeNull();
    expect(computeResolvedAt("IN_PROGRESS", earlier, now)).toBeNull();
    expect(computeResolvedAt("CANCELLED", earlier, now)).toBeNull();
  });
});

describe("RBAC", () => {
  const property = { ownerId: "owner", managerId: "manager" };

  it("identifie les rôles de gestion", () => {
    expect(isStaffRole("ADMIN")).toBe(true);
    expect(isStaffRole("LANDLORD")).toBe(true);
    expect(isStaffRole("MANAGER")).toBe(true);
    expect(isStaffRole("TENANT")).toBe(false);
  });

  it("canManageProperty", () => {
    expect(canManageProperty({ id: "x", role: "ADMIN" }, property)).toBe(true);
    expect(canManageProperty({ id: "owner", role: "LANDLORD" }, property)).toBe(true);
    expect(canManageProperty({ id: "manager", role: "MANAGER" }, property)).toBe(true);
    expect(canManageProperty({ id: "other", role: "LANDLORD" }, property)).toBe(false);
    expect(
      canManageProperty({ id: "manager", role: "MANAGER" }, { ownerId: "owner", managerId: null })
    ).toBe(false);
    // Un locataire ne gère jamais, même si son id coïncidait.
    expect(canManageProperty({ id: "owner", role: "TENANT" }, property)).toBe(false);
  });

  it("canDeleteRequest", () => {
    const open = { tenantId: "tenant", status: "OPEN" as const, property };
    const inProgress = { ...open, status: "IN_PROGRESS" as const };
    const tenant = { id: "tenant", role: "TENANT" as const };

    expect(canDeleteRequest(tenant, open)).toBe(true);
    expect(canDeleteRequest(tenant, inProgress)).toBe(false);
    expect(canDeleteRequest({ id: "other", role: "TENANT" }, open)).toBe(false);
    expect(canDeleteRequest({ id: "owner", role: "LANDLORD" }, inProgress)).toBe(true);
    expect(canDeleteRequest({ id: "manager", role: "MANAGER" }, inProgress)).toBe(true);
    expect(canDeleteRequest({ id: "a", role: "ADMIN" }, inProgress)).toBe(true);
  });
});
