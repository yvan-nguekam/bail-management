import { NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"
import type { NextRequest } from "next/server"
import createMiddleware from "next-intl/middleware"
import { routing, defaultLocale, type Locale } from "./i18n/routing"

const intlMiddleware = createMiddleware(routing)

// Public routes that don't require authentication
const publicRoutes = ["/", "/auth/login", "/auth/register"]
const authRoutes = ["/auth/login", "/auth/register"]

// Build a URL path for a locale, without prefix for the default locale ("as-needed")
function localizedPath(locale: Locale, path: string) {
  return locale === defaultLocale ? path : `/${locale}${path === "/" ? "" : path}`
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const localeMatch = pathname.match(/^\/(en|fr)(?=\/|$)/)
  const locale = (localeMatch?.[1] as Locale | undefined) ?? defaultLocale
  const pathnameWithoutLocale = pathname.replace(/^\/(en|fr)(?=\/|$)/, "") || "/"

  const redirectTo = (path: string) =>
    NextResponse.redirect(new URL(localizedPath(locale, path), request.url))

  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  })

  if (publicRoutes.includes(pathnameWithoutLocale)) {
    // Already logged in users don't need the auth pages
    if (token && authRoutes.includes(pathnameWithoutLocale)) {
      return redirectTo("/dashboard")
    }
    return intlMiddleware(request)
  }

  // Protected routes require authentication
  if (!token) {
    const url = new URL(localizedPath(locale, "/auth/login"), request.url)
    url.searchParams.set("callbackUrl", pathname)
    return NextResponse.redirect(url)
  }

  // Role-based access control
  const role = token.role as string

  if (pathnameWithoutLocale.startsWith("/admin") && role !== "ADMIN") {
    return redirectTo("/dashboard")
  }

  if (
    pathnameWithoutLocale.startsWith("/landlord") &&
    !["LANDLORD", "MANAGER", "ADMIN"].includes(role)
  ) {
    return redirectTo("/dashboard")
  }

  if (pathnameWithoutLocale.startsWith("/tenant") && role !== "TENANT" && role !== "ADMIN") {
    return redirectTo("/dashboard")
  }

  return intlMiddleware(request)
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
