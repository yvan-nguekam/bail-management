import { NextResponse } from "next/server"
import {
  getClientIp,
  rateLimiter,
  tooManyRequestsBody,
  type RateLimitName,
} from "@/lib/rate-limit"

/**
 * Consomme une tentative pour `name` + `key` (par défaut l'IP du client).
 * Renvoie une réponse 429 prête à retourner, ou null si la requête est autorisée.
 */
export function enforceRateLimit(
  request: Request,
  name: RateLimitName,
  key: string = getClientIp(request.headers)
): NextResponse | null {
  const result = rateLimiter(name).consume(`${name}:${key}`)
  if (result.allowed) return null
  const { body, headers } = tooManyRequestsBody(result.retryAfterMs)
  return NextResponse.json(body, { status: 429, headers })
}
