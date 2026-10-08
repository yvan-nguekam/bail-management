/** @jest-environment node */
import {
  NOTIFICATION_TYPES,
  formatRelativeDate,
  groupByReadState,
  isNotificationType,
  notificationMeta,
} from "../notifications"

describe("notificationMeta", () => {
  it("associe une icône, une teinte et un libellé à chaque type", () => {
    for (const type of NOTIFICATION_TYPES) {
      const meta = notificationMeta(type)
      expect(meta.icon).toBeTruthy()
      expect(meta.tone).toBeTruthy()
      expect(meta.label).toBeTruthy()
    }
    expect(notificationMeta("PAYMENT_DUE").tone).toBe("danger")
    expect(notificationMeta("PAYMENT_RECEIVED").tone).toBe("success")
    expect(notificationMeta("MESSAGE").label).toBe("Message")
  })

  it("retombe sur une icône neutre pour un type inconnu", () => {
    expect(notificationMeta("UNKNOWN").tone).toBe("default")
    expect(isNotificationType("UNKNOWN")).toBe(false)
    expect(isNotificationType("SYSTEM")).toBe(true)
  })
})

describe("formatRelativeDate", () => {
  const now = new Date("2026-10-07T12:00:00Z")

  it("renvoie une durée relative en français", () => {
    expect(formatRelativeDate(new Date("2026-10-07T11:59:40Z"), now)).toBe("à l'instant")
    expect(formatRelativeDate(new Date("2026-10-07T11:55:00Z"), now)).toBe("il y a 5 min")
    expect(formatRelativeDate(new Date("2026-10-07T09:00:00Z"), now)).toBe("il y a 3 h")
    expect(formatRelativeDate(new Date("2026-10-06T08:00:00Z"), now)).toBe("hier")
    expect(formatRelativeDate(new Date("2026-10-03T12:00:00Z"), now)).toBe("il y a 4 j")
  })

  it("affiche la date complète au-delà d'une semaine", () => {
    expect(formatRelativeDate("2026-09-01T12:00:00Z", now)).toMatch(/2026/)
  })
})

describe("groupByReadState", () => {
  it("sépare non lues et lues, les plus récentes en premier", () => {
    const items = [
      { id: "a", read: true, createdAt: "2026-10-01T00:00:00Z" },
      { id: "b", read: false, createdAt: "2026-10-02T00:00:00Z" },
      { id: "c", read: false, createdAt: "2026-10-05T00:00:00Z" },
      { id: "d", read: true, createdAt: "2026-10-04T00:00:00Z" },
    ]
    const { unread, read } = groupByReadState(items)
    expect(unread.map((n) => n.id)).toEqual(["c", "b"])
    expect(read.map((n) => n.id)).toEqual(["d", "a"])
  })
})
