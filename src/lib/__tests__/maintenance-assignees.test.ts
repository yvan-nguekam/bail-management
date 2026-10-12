/**
 * @jest-environment node
 */
import { isAllowedAssignee, staffAssigneeIds } from "@/lib/maintenance-assignees"

const property = { ownerId: "owner", managerId: "manager" }

describe("isAllowedAssignee", () => {
  it("accepts the property owner, its manager and admins", () => {
    expect(isAllowedAssignee({ id: "owner", role: "LANDLORD" }, property)).toBe(true)
    expect(isAllowedAssignee({ id: "manager", role: "MANAGER" }, property)).toBe(true)
    expect(isAllowedAssignee({ id: "admin", role: "ADMIN" }, property)).toBe(true)
  })

  it("rejects staff of other properties and tenants", () => {
    expect(isAllowedAssignee({ id: "other", role: "LANDLORD" }, property)).toBe(false)
    expect(isAllowedAssignee({ id: "other", role: "MANAGER" }, property)).toBe(false)
    expect(isAllowedAssignee({ id: "t", role: "TENANT" }, property)).toBe(false)
  })

  it("keeps the current assignee valid, unless it is a tenant", () => {
    expect(isAllowedAssignee({ id: "other", role: "MANAGER" }, property, "other")).toBe(true)
    expect(isAllowedAssignee({ id: "t", role: "TENANT" }, property, "t")).toBe(false)
  })
})

describe("staffAssigneeIds", () => {
  it("lists owner and manager, plus the caller when admin", () => {
    expect(staffAssigneeIds(property, { id: "owner", role: "LANDLORD" })).toEqual([
      "owner",
      "manager",
    ])
    expect(staffAssigneeIds({ ownerId: "owner", managerId: null }, { id: "a", role: "ADMIN" })).toEqual([
      "owner",
      "a",
    ])
    expect(staffAssigneeIds(property, { id: "owner", role: "ADMIN" })).toEqual(["owner", "manager"])
  })
})
