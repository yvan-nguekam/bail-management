/**
 * @jest-environment node
 */
import { createRateLimiter, getClientIp, tooManyRequestsBody } from "@/lib/rate-limit"

function clock(start = 1_000_000) {
  let t = start
  return {
    now: () => t,
    advance: (ms: number) => {
      t += ms
    },
  }
}

describe("createRateLimiter", () => {
  it("allows up to the limit then blocks with a retry delay", () => {
    const c = clock()
    const limiter = createRateLimiter({ limit: 3, windowMs: 60_000, now: c.now })

    expect(limiter.consume("k")).toMatchObject({ allowed: true, remaining: 2 })
    c.advance(1_000)
    expect(limiter.consume("k")).toMatchObject({ allowed: true, remaining: 1 })
    c.advance(1_000)
    expect(limiter.consume("k")).toMatchObject({ allowed: true, remaining: 0 })

    const blocked = limiter.consume("k")
    expect(blocked.allowed).toBe(false)
    // The first hit (t0) leaves the window at t0 + 60s; we are at t0 + 2s
    expect(blocked.retryAfterMs).toBe(58_000)
  })

  it("is a sliding window: old hits expire one by one", () => {
    const c = clock()
    const limiter = createRateLimiter({ limit: 2, windowMs: 10_000, now: c.now })
    limiter.consume("k")
    c.advance(5_000)
    limiter.consume("k")
    expect(limiter.check("k").allowed).toBe(false)

    c.advance(5_000) // first hit expires
    expect(limiter.check("k")).toMatchObject({ allowed: true, remaining: 1 })
    expect(limiter.consume("k").allowed).toBe(true)
    expect(limiter.consume("k").allowed).toBe(false)
  })

  it("keeps keys independent", () => {
    const limiter = createRateLimiter({ limit: 1, windowMs: 10_000, now: () => 0 })
    expect(limiter.consume("a").allowed).toBe(true)
    expect(limiter.consume("a").allowed).toBe(false)
    expect(limiter.consume("b").allowed).toBe(true)
  })

  it("check does not record and blocked consumes are not recorded", () => {
    const c = clock()
    const limiter = createRateLimiter({ limit: 1, windowMs: 10_000, now: c.now })
    limiter.check("k")
    limiter.check("k")
    expect(limiter.consume("k").allowed).toBe(true)
    c.advance(9_000)
    expect(limiter.consume("k").allowed).toBe(false)
    c.advance(1_000)
    // Blocked attempts did not extend the window
    expect(limiter.consume("k").allowed).toBe(true)
  })

  it("hit records even past the limit, reset forgets the key", () => {
    const limiter = createRateLimiter({ limit: 2, windowMs: 10_000, now: () => 0 })
    limiter.hit("k")
    limiter.hit("k")
    limiter.hit("k")
    expect(limiter.check("k")).toMatchObject({ allowed: false, remaining: 0 })
    limiter.reset("k")
    expect(limiter.check("k")).toMatchObject({ allowed: true, remaining: 2 })
  })

  it("purges expired keys once maxKeys is exceeded", () => {
    const c = clock()
    const limiter = createRateLimiter({ limit: 1, windowMs: 1_000, now: c.now, maxKeys: 2 })
    limiter.consume("a")
    limiter.consume("b")
    c.advance(2_000)
    limiter.consume("c") // triggers the sweep: a and b are expired
    expect(limiter.check("a").allowed).toBe(true)
    expect(limiter.check("c").allowed).toBe(false)
  })
})

describe("getClientIp", () => {
  it("reads the first x-forwarded-for entry from a Headers object", () => {
    const headers = new Headers({ "x-forwarded-for": "203.0.113.7, 10.0.0.1" })
    expect(getClientIp(headers)).toBe("203.0.113.7")
  })

  it("falls back to x-real-ip, then to 'unknown'", () => {
    expect(getClientIp(new Headers({ "x-real-ip": "198.51.100.2" }))).toBe("198.51.100.2")
    expect(getClientIp(new Headers())).toBe("unknown")
    expect(getClientIp(undefined)).toBe("unknown")
  })

  it("accepts a plain header record (NextAuth authorize req)", () => {
    expect(getClientIp({ "x-forwarded-for": "192.0.2.1" })).toBe("192.0.2.1")
    expect(getClientIp({ "x-forwarded-for": ["192.0.2.9"] })).toBe("192.0.2.9")
  })
})

describe("tooManyRequestsBody", () => {
  it("gives a French message in minutes and a Retry-After in seconds", () => {
    const { body, headers } = tooManyRequestsBody(61_000)
    expect(body.error).toBe("Trop de tentatives. Réessayez dans 2 minutes.")
    expect(body.code).toBe("RATE_LIMITED")
    expect(headers["Retry-After"]).toBe("61")
    expect(tooManyRequestsBody(500).body.error).toContain("1 minute.")
  })
})
