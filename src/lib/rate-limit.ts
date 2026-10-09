/**
 * Limiteur de débit en mémoire (fenêtre glissante, journal des horodatages par clé).
 *
 * LIMITE CONNUE : l'état vit dans la mémoire du processus Node. Chaque instance
 * (ou chaque fonction serverless « froide ») a son propre compteur, et tout est
 * perdu au redémarrage. Suffisant pour une instance unique ; en production
 * multi-instances, remplacer l'implémentation de `RateLimiter` par un stockage
 * partagé (Upstash Ratelimit / Redis) en gardant la même interface.
 */

export interface RateLimitResult {
  allowed: boolean
  /** Tentatives restantes dans la fenêtre courante (après celle-ci si `consume`). */
  remaining: number
  /** Délai avant qu'une nouvelle tentative soit acceptée (0 si autorisé). */
  retryAfterMs: number
}

export interface RateLimiter {
  /** Lit l'état sans enregistrer de tentative. */
  check(key: string): RateLimitResult
  /** Enregistre une tentative si elle est autorisée. */
  consume(key: string): RateLimitResult
  /** Enregistre une tentative même si la limite est déjà atteinte (ex. échec de connexion). */
  hit(key: string): void
  /** Oublie la clé (ex. connexion réussie). */
  reset(key: string): void
}

export interface RateLimiterOptions {
  /** Nombre maximal de tentatives dans la fenêtre. */
  limit: number
  /** Durée de la fenêtre glissante en millisecondes. */
  windowMs: number
  /** Horloge injectable pour les tests. */
  now?: () => number
  /** Au-delà de ce nombre de clés, les entrées expirées sont purgées. */
  maxKeys?: number
}

export function createRateLimiter({
  limit,
  windowMs,
  now = Date.now,
  maxKeys = 10_000,
}: RateLimiterOptions): RateLimiter {
  const hits = new Map<string, number[]>()

  const recent = (key: string, at: number): number[] => {
    const list = hits.get(key)
    if (!list) return []
    const fresh = list.filter((t) => t > at - windowMs)
    if (fresh.length === 0) hits.delete(key)
    else if (fresh.length !== list.length) hits.set(key, fresh)
    return fresh
  }

  const sweep = (at: number) => {
    if (hits.size <= maxKeys) return
    for (const key of [...hits.keys()]) recent(key, at)
  }

  const result = (list: number[], at: number): RateLimitResult => {
    const allowed = list.length < limit
    return {
      allowed,
      remaining: Math.max(0, limit - list.length),
      retryAfterMs: allowed ? 0 : Math.max(0, list[list.length - limit] + windowMs - at),
    }
  }

  const record = (key: string, list: number[], at: number) => {
    hits.set(key, [...list, at])
    sweep(at)
  }

  return {
    check(key) {
      const at = now()
      return result(recent(key, at), at)
    },
    consume(key) {
      const at = now()
      const list = recent(key, at)
      const state = result(list, at)
      if (!state.allowed) return state
      record(key, list, at)
      return { ...state, remaining: state.remaining - 1 }
    },
    hit(key) {
      const at = now()
      record(key, recent(key, at), at)
    },
    reset(key) {
      hits.delete(key)
    },
  }
}

const MINUTE = 60_000

/**
 * Limites de l'application, partagées par toutes les routes du processus
 * (conservées sur globalThis pour survivre au rechargement à chaud en dev).
 */
const definitions = {
  /** Échecs de connexion par couple e-mail + IP. */
  loginEmail: { limit: 5, windowMs: 15 * MINUTE },
  /** Échecs de connexion par IP (tous e-mails confondus). */
  loginIp: { limit: 30, windowMs: 15 * MINUTE },
  register: { limit: 5, windowMs: 60 * MINUTE },
  forgotPasswordIp: { limit: 5, windowMs: 15 * MINUTE },
  forgotPasswordEmail: { limit: 3, windowMs: 60 * MINUTE },
  resetPassword: { limit: 10, windowMs: 15 * MINUTE },
  acceptInvite: { limit: 10, windowMs: 15 * MINUTE },
  tenantLookup: { limit: 20, windowMs: 15 * MINUTE },
  tenantInvite: { limit: 20, windowMs: 60 * MINUTE },
} satisfies Record<string, { limit: number; windowMs: number }>

export type RateLimitName = keyof typeof definitions

const globalForLimits = globalThis as unknown as {
  rateLimiters?: Map<RateLimitName, RateLimiter>
}

export function rateLimiter(name: RateLimitName): RateLimiter {
  globalForLimits.rateLimiters ??= new Map()
  let limiter = globalForLimits.rateLimiters.get(name)
  if (!limiter) {
    limiter = createRateLimiter(definitions[name])
    globalForLimits.rateLimiters.set(name, limiter)
  }
  return limiter
}

type HeaderSource =
  | { get(name: string): string | null }
  | Record<string, string | string[] | undefined>
  | undefined
  | null

function readHeader(headers: HeaderSource, name: string): string | undefined {
  if (!headers) return undefined
  if (typeof (headers as { get?: unknown }).get === "function") {
    return (headers as { get(name: string): string | null }).get(name) ?? undefined
  }
  const value = (headers as Record<string, string | string[] | undefined>)[name]
  return Array.isArray(value) ? value[0] : value
}

/**
 * IP du client d'après les en-têtes posés par le proxy / l'hébergeur (Vercel, Nginx…).
 * `x-forwarded-for` n'est fiable que derrière un proxy qui l'écrase : sans proxy,
 * un client peut le forger — d'où les limites complémentaires par e-mail.
 */
export function getClientIp(headers: HeaderSource): string {
  const forwarded = readHeader(headers, "x-forwarded-for")
  const first = forwarded?.split(",")[0]?.trim()
  if (first) return first
  return readHeader(headers, "x-real-ip")?.trim() || "unknown"
}

/** Message et en-tête `Retry-After` d'une réponse 429. */
export function tooManyRequestsBody(retryAfterMs: number) {
  const minutes = Math.max(1, Math.ceil(retryAfterMs / MINUTE))
  return {
    body: {
      error: `Trop de tentatives. Réessayez dans ${minutes} minute${minutes > 1 ? "s" : ""}.`,
      code: "RATE_LIMITED",
    },
    headers: { "Retry-After": String(Math.ceil(retryAfterMs / 1000)) },
  }
}
