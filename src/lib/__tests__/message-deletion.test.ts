/**
 * @jest-environment node
 */
import { deletionFor, isDeletedFor, visibleMessagesWhere } from "@/lib/messages"

const now = new Date("2026-10-12T10:00:00.000Z")
const base = { senderId: "alice", receiverId: "bob", deletedBySenderAt: null, deletedByReceiverAt: null }

describe("per-participant message deletion", () => {
  it("hides the message only for the participant who deletes it first", () => {
    expect(deletionFor("alice", base, now)).toEqual({ action: "hide", data: { deletedBySenderAt: now } })
    expect(deletionFor("bob", base, now)).toEqual({ action: "hide", data: { deletedByReceiverAt: now } })
  })

  it("deletes for good once both participants deleted it", () => {
    expect(deletionFor("bob", { ...base, deletedBySenderAt: now }, now)).toEqual({ action: "hard-delete" })
    expect(deletionFor("alice", { ...base, deletedByReceiverAt: now }, now)).toEqual({ action: "hard-delete" })
  })

  it("tells whether the message is gone for a given user only", () => {
    const hiddenForAlice = { ...base, deletedBySenderAt: now }
    expect(isDeletedFor("alice", hiddenForAlice)).toBe(true)
    expect(isDeletedFor("bob", hiddenForAlice)).toBe(false)
  })

  it("builds the inbox filter on the caller's own deletion flag", () => {
    expect(visibleMessagesWhere("bob")).toEqual({
      OR: [
        { senderId: "bob", deletedBySenderAt: null },
        { receiverId: "bob", deletedByReceiverAt: null },
      ],
    })
  })
})
