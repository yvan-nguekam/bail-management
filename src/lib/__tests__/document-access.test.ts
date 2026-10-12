/** @jest-environment node */
import { checkDocumentTargetAccess, type DocumentAccessDb } from "../document-access"

type PropertyRow = { ownerId: string; managerId: string | null }
type LeaseRow = { tenantId: string; property: PropertyRow }

function fakeDb(properties: Record<string, PropertyRow>, leases: Record<string, LeaseRow>) {
  const db = {
    property: {
      findUnique: jest.fn(async ({ where }: { where: { id: string } }) => properties[where.id] ?? null),
    },
    lease: {
      findUnique: jest.fn(async ({ where }: { where: { id: string } }) => leases[where.id] ?? null),
    },
  }
  return db as typeof db & DocumentAccessDb
}

const properties = {
  p1: { ownerId: "owner", managerId: "manager" },
  p2: { ownerId: "other", managerId: null },
}
const leases = {
  l1: { tenantId: "tenant", property: properties.p1 },
  l2: { tenantId: "tenant2", property: properties.p2 },
}

describe("checkDocumentTargetAccess", () => {
  it("autorise un document sans rattachement", async () => {
    const db = fakeDb(properties, leases)
    await expect(checkDocumentTargetAccess(db, { id: "x", role: "TENANT" }, {})).resolves.toEqual({
      ok: true,
    })
    expect(db.property.findUnique).not.toHaveBeenCalled()
  })

  it("autorise l'admin sans interroger la base", async () => {
    const db = fakeDb(properties, leases)
    const result = await checkDocumentTargetAccess(
      db,
      { id: "admin", role: "ADMIN" },
      { propertyId: "p2", leaseId: "missing" }
    )
    expect(result.ok).toBe(true)
    expect(db.property.findUnique).not.toHaveBeenCalled()
    expect(db.lease.findUnique).not.toHaveBeenCalled()
  })

  it("autorise propriétaire et gestionnaire du bien", async () => {
    const db = fakeDb(properties, leases)
    for (const id of ["owner", "manager"]) {
      const result = await checkDocumentTargetAccess(db, { id, role: "LANDLORD" }, { propertyId: "p1" })
      expect(result.ok).toBe(true)
    }
  })

  it("refuse un bien d'un autre propriétaire ou inexistant (403)", async () => {
    const db = fakeDb(properties, leases)
    for (const propertyId of ["p2", "missing"]) {
      const result = await checkDocumentTargetAccess(
        db,
        { id: "owner", role: "LANDLORD" },
        { propertyId }
      )
      expect(result).toEqual({ ok: false, status: 403, error: "Non autorisé pour cette propriété" })
    }
  })

  it("autorise le locataire du bail et le bailleur du bien loué", async () => {
    const db = fakeDb(properties, leases)
    for (const id of ["tenant", "owner", "manager"]) {
      const result = await checkDocumentTargetAccess(db, { id, role: "TENANT" }, { leaseId: "l1" })
      expect(result.ok).toBe(true)
    }
  })

  it("refuse le bail d'un autre locataire ou inexistant", async () => {
    const db = fakeDb(properties, leases)
    for (const leaseId of ["l2", "missing"]) {
      const result = await checkDocumentTargetAccess(db, { id: "tenant", role: "TENANT" }, { leaseId })
      expect(result).toEqual({ ok: false, status: 403, error: "Non autorisé pour ce bail" })
    }
  })

  it("un locataire ne peut pas rattacher un document directement à un bien", async () => {
    const db = fakeDb(properties, leases)
    const result = await checkDocumentTargetAccess(
      db,
      { id: "tenant", role: "TENANT" },
      { propertyId: "p1", leaseId: "l1" }
    )
    expect(result.ok).toBe(false)
  })
})
