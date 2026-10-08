/** @jest-environment node */
import {
  USER_ROLES,
  canChangeRole,
  initials,
  isUserRole,
  userRoleLabel,
  userRoleLabels,
} from "../users"

describe("rôles", () => {
  it("a un libellé français pour chaque rôle", () => {
    for (const r of USER_ROLES) expect(userRoleLabels[r]).toBeTruthy()
    expect(userRoleLabel("TENANT")).toBe("Locataire")
    expect(isUserRole("ADMIN")).toBe(true)
    expect(isUserRole("ROOT")).toBe(false)
  })
})

describe("canChangeRole", () => {
  it("réserve le changement de rôle à l'admin, sauf sur lui-même", () => {
    expect(canChangeRole({ id: "a", role: "ADMIN" }, "b")).toBe(true)
    expect(canChangeRole({ id: "a", role: "ADMIN" }, "a")).toBe(false)
    expect(canChangeRole({ id: "a", role: "LANDLORD" }, "b")).toBe(false)
  })
})

describe("initials", () => {
  it("garde deux lettres au plus", () => {
    expect(initials("Yvan Nguekam")).toBe("YN")
    expect(initials("  claire  ")).toBe("C")
    expect(initials("Jean Marie Le Bon")).toBe("JM")
  })
})
