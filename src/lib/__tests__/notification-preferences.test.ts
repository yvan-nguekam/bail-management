/**
 * @jest-environment node
 */
import {
  DEFAULT_EMAIL_PREFERENCES,
  absoluteUrl,
  appBaseUrl,
  buildEmailSubject,
  emailCategoryFor,
  emailPreferencesUpdateSchema,
  shouldSendEmail,
} from "@/lib/notification-preferences"
import { NOTIFICATION_TYPES } from "@/lib/notifications"

describe("emailCategoryFor", () => {
  it("maps every notification type to a category (SYSTEM has none)", () => {
    expect(emailCategoryFor("PAYMENT_DUE")).toBe("payments")
    expect(emailCategoryFor("PAYMENT_RECEIVED")).toBe("payments")
    expect(emailCategoryFor("LEASE_EXPIRING")).toBe("leases")
    expect(emailCategoryFor("DEPOSIT_SETTLED")).toBe("leases")
    expect(emailCategoryFor("MAINTENANCE_UPDATE")).toBe("maintenance")
    expect(emailCategoryFor("MESSAGE")).toBe("messages")
    expect(emailCategoryFor("SYSTEM")).toBeNull()
    const uncategorized = NOTIFICATION_TYPES.filter((type) => emailCategoryFor(type) === null)
    expect(uncategorized).toEqual(["SYSTEM"])
  })
})

describe("shouldSendEmail", () => {
  it("sends by default", () => {
    expect(shouldSendEmail(DEFAULT_EMAIL_PREFERENCES, "MESSAGE")).toBe(true)
    expect(shouldSendEmail(null, "PAYMENT_DUE")).toBe(true)
  })

  it("respects the master switch for every type, SYSTEM included", () => {
    const off = { ...DEFAULT_EMAIL_PREFERENCES, emailNotifications: false }
    expect(shouldSendEmail(off, "PAYMENT_DUE")).toBe(false)
    expect(shouldSendEmail(off, "SYSTEM")).toBe(false)
  })

  it("respects per-category opt-outs only for that category", () => {
    const noPayments = { ...DEFAULT_EMAIL_PREFERENCES, emailPayments: false }
    expect(shouldSendEmail(noPayments, "PAYMENT_DUE")).toBe(false)
    expect(shouldSendEmail(noPayments, "PAYMENT_RECEIVED")).toBe(false)
    expect(shouldSendEmail(noPayments, "LEASE_EXPIRED")).toBe(true)
    expect(shouldSendEmail(noPayments, "SYSTEM")).toBe(true)
  })
})

describe("buildEmailSubject", () => {
  it("joins title and detail and normalizes spaces", () => {
    expect(buildEmailSubject("Loyer en retard", "Villa  Bonapriso ")).toBe(
      "Loyer en retard · Villa Bonapriso"
    )
    expect(buildEmailSubject("Nouveau message")).toBe("Nouveau message")
    expect(buildEmailSubject("  ")).toBe("RentalManager")
  })

  it("truncates long subjects", () => {
    const subject = buildEmailSubject("Nouveau message", "x".repeat(300))
    expect(subject).toHaveLength(120)
    expect(subject.endsWith("…")).toBe(true)
  })
})

describe("absoluteUrl", () => {
  it("prefers APP_URL, then NEXTAUTH_URL, without trailing slash", () => {
    expect(appBaseUrl({ APP_URL: "https://app.example.com/", NEXTAUTH_URL: "https://x" })).toBe(
      "https://app.example.com"
    )
    expect(appBaseUrl({ NEXTAUTH_URL: "https://auth.example.com" })).toBe("https://auth.example.com")
    expect(appBaseUrl({})).toBe("http://localhost:3000")
  })

  it("builds links from app paths and keeps absolute ones", () => {
    const env = { APP_URL: "https://app.example.com" }
    expect(absoluteUrl("/payments/1", env)).toBe("https://app.example.com/payments/1")
    expect(absoluteUrl("leases/2", env)).toBe("https://app.example.com/leases/2")
    expect(absoluteUrl("https://other.com/x", env)).toBe("https://other.com/x")
  })
})

describe("emailPreferencesUpdateSchema", () => {
  it("accepts partial boolean updates", () => {
    expect(emailPreferencesUpdateSchema.parse({ emailMessages: false })).toEqual({
      emailMessages: false,
    })
  })

  it("rejects empty, unknown or non-boolean fields", () => {
    expect(emailPreferencesUpdateSchema.safeParse({}).success).toBe(false)
    expect(emailPreferencesUpdateSchema.safeParse({ role: "ADMIN" }).success).toBe(false)
    expect(emailPreferencesUpdateSchema.safeParse({ emailPayments: "no" }).success).toBe(false)
  })
})
