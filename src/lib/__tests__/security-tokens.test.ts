/**
 * @jest-environment node
 */
import {
  INVITATION_TTL_MS,
  PASSWORD_RESET_TTL_MS,
  expiresAt,
  generateToken,
  hashToken,
  isSessionRevoked,
  isWellFormedToken,
  normalizeEmail,
  tokenState,
} from "@/lib/security-tokens"

describe("generateToken / hashToken", () => {
  it("returns a 256-bit url-safe token and its SHA-256 hex hash", () => {
    const { token, tokenHash } = generateToken()
    expect(isWellFormedToken(token)).toBe(true)
    expect(tokenHash).toMatch(/^[0-9a-f]{64}$/)
    expect(hashToken(token)).toBe(tokenHash)
    expect(tokenHash).not.toContain(token)
  })

  it("never repeats", () => {
    const tokens = new Set(Array.from({ length: 200 }, () => generateToken().token))
    expect(tokens.size).toBe(200)
  })

  it("hashes deterministically (known vector)", () => {
    expect(hashToken("abc")).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"
    )
  })
})

describe("isWellFormedToken", () => {
  it("rejects anything that is not a 43-char base64url string", () => {
    expect(isWellFormedToken(undefined)).toBe(false)
    expect(isWellFormedToken("")).toBe(false)
    expect(isWellFormedToken("a".repeat(42))).toBe(false)
    expect(isWellFormedToken("a".repeat(44))).toBe(false)
    expect(isWellFormedToken("a".repeat(42) + "=")).toBe(false)
    expect(isWellFormedToken("a".repeat(43))).toBe(true)
  })
})

describe("expiry", () => {
  const now = new Date("2026-10-08T10:00:00Z")

  it("uses 1 h for resets and 7 days for invitations", () => {
    expect(expiresAt(PASSWORD_RESET_TTL_MS, now).toISOString()).toBe("2026-10-08T11:00:00.000Z")
    expect(expiresAt(INVITATION_TTL_MS, now).toISOString()).toBe("2026-10-15T10:00:00.000Z")
  })

  it("tokenState: valid, expired at the exact instant, used wins", () => {
    const exp = new Date("2026-10-08T11:00:00Z")
    expect(tokenState({ expiresAt: exp }, now)).toBe("valid")
    expect(tokenState({ expiresAt: exp }, exp)).toBe("expired")
    expect(tokenState({ expiresAt: exp, usedAt: now }, now)).toBe("used")
    expect(tokenState({ expiresAt: exp, acceptedAt: now }, now)).toBe("used")
    expect(tokenState({ expiresAt: now, usedAt: now }, exp)).toBe("used")
  })
})

describe("normalizeEmail", () => {
  it("trims and lowercases", () => {
    expect(normalizeEmail("  Tenant@Test.COM ")).toBe("tenant@test.com")
  })
})

describe("isSessionRevoked", () => {
  const changed = new Date("2026-10-08T10:00:00Z")

  it("keeps sessions when the password never changed", () => {
    expect(isSessionRevoked(undefined, null)).toBe(false)
    expect(isSessionRevoked(123, undefined)).toBe(false)
  })

  it("revokes sessions opened before the change, keeps later ones", () => {
    expect(isSessionRevoked(changed.getTime() - 1, changed)).toBe(true)
    expect(isSessionRevoked(changed.getTime(), changed)).toBe(false)
    expect(isSessionRevoked(changed.getTime() + 1000, changed)).toBe(false)
  })

  it("revokes tokens without a usable auth time once a change happened", () => {
    expect(isSessionRevoked(undefined, changed)).toBe(true)
    expect(isSessionRevoked(Number.NaN, changed)).toBe(true)
  })
})
