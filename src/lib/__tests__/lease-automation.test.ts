/**
 * @jest-environment node
 */
import { daysUntil, decideExpiryNotice } from "@/lib/lease-automation"

const d = (iso: string) => new Date(`${iso}T00:00:00.000Z`)

describe("daysUntil", () => {
  it("counts UTC calendar days regardless of time of day", () => {
    expect(daysUntil(d("2026-03-31"), new Date("2026-03-01T23:00:00.000Z"))).toBe(30)
    expect(daysUntil(d("2026-03-01"), d("2026-03-01"))).toBe(0)
    expect(daysUntil(d("2026-02-28"), d("2026-03-01"))).toBe(-1)
  })
})

describe("decideExpiryNotice", () => {
  it("does nothing while the lease ends beyond every threshold", () => {
    expect(decideExpiryNotice(90, null)).toEqual({ action: "none" })
  })

  it("sends the 60-day notice, then the 30-day one, once each", () => {
    expect(decideExpiryNotice(60, null)).toEqual({ action: "send", noticeDays: 60 })
    expect(decideExpiryNotice(45, 60)).toEqual({ action: "none" })
    expect(decideExpiryNotice(30, 60)).toEqual({ action: "send", noticeDays: 30 })
    expect(decideExpiryNotice(10, 30)).toEqual({ action: "none" })
    expect(decideExpiryNotice(0, 30)).toEqual({ action: "none" })
  })

  it("only sends the most relevant notice when starting late", () => {
    expect(decideExpiryNotice(20, null)).toEqual({ action: "send", noticeDays: 30 })
  })

  it("catches up if the job missed the 60-day window", () => {
    expect(decideExpiryNotice(25, 60)).toEqual({ action: "send", noticeDays: 30 })
  })

  it("resets the marker when the lease is extended", () => {
    expect(decideExpiryNotice(200, 30)).toEqual({ action: "reset" })
  })

  it("ignores leases that already ended", () => {
    expect(decideExpiryNotice(-3, null)).toEqual({ action: "none" })
  })
})
