/**
 * @jest-environment node
 */
import {
  canManageTenants,
  lookupResult,
  parseLookupEmail,
  pickerTenantWhere,
} from "@/lib/tenant-directory"

describe("parseLookupEmail", () => {
  it("normalizes a complete address", () => {
    expect(parseLookupEmail("  Tenant@Test.COM ")).toBe("tenant@test.com")
  })

  it("rejects partial input, wildcards and junk", () => {
    for (const value of [
      null,
      undefined,
      "",
      "tenant",
      "tenant@",
      "@test.com",
      "test.com",
      "a@b",
      "ten%@test.com",
      "t*@test.com",
      "a b@test.com",
      `${"a".repeat(250)}@test.com`,
    ]) {
      expect(parseLookupEmail(value as string | null | undefined)).toBeNull()
    }
  })
})

describe("lookupResult", () => {
  it("only exposes id and name", () => {
    const user = { id: "u1", name: "Aminatou", email: "x@y.z", phone: "123" }
    expect(lookupResult(user)).toEqual({ id: "u1", name: "Aminatou" })
    expect(lookupResult(null)).toBeNull()
  })
})

describe("pickerTenantWhere", () => {
  const scope = { property: { OR: [{ ownerId: "l1" }, { managerId: "l1" }] } }

  it("restricts to TENANT accounts with a lease in scope", () => {
    expect(pickerTenantWhere(scope, [])).toEqual({
      role: "TENANT",
      OR: [{ leases: { some: scope } }],
    })
  })

  it("adds tenants who accepted my invitations", () => {
    expect(pickerTenantWhere(scope, ["new@test.com"])).toEqual({
      role: "TENANT",
      OR: [{ leases: { some: scope } }, { email: { in: ["new@test.com"] } }],
    })
  })
})

describe("canManageTenants", () => {
  it("allows landlords, managers and admins only", () => {
    expect(canManageTenants("LANDLORD")).toBe(true)
    expect(canManageTenants("MANAGER")).toBe(true)
    expect(canManageTenants("ADMIN")).toBe(true)
    expect(canManageTenants("TENANT")).toBe(false)
  })
})
