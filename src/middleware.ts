import { NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"
import type { NextRequest } from "next/server"
import createMiddleware from "next-intl/middleware"
import { locales, defaultLocale } from "./i18n"

// Create next-intl middleware
const intlMiddleware = createMiddleware({
  locales,
  defaultLocale,
  localePrefix: "as-needed"
})

export async function middleware(request: NextRequest) {
  // Handle internationalization first
  const intlResponse = intlMiddleware(request)

  // Get locale from pathname or use default
  const locale = request.nextUrl.pathname.match(/^\/(en|fr)/)?.[1] || defaultLocale
  const pathnameWithoutLocale = request.nextUrl.pathname.replace(/^\/(en|fr)/, "") || "/"

  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  })

  // Public routes that don't require authentication
  const publicRoutes = ["/", "/auth/login", "/auth/register"]
  const isPublicRoute = publicRoutes.some(route => pathnameWithoutLocale === route)

  // If accessing a public route, allow access
  if (isPublicRoute) {
    // If already logged in and trying to access auth pages, redirect to dashboard
    if (token && (pathnameWithoutLocale === "/auth/login" || pathnameWithoutLocale === "/auth/register")) {
      return NextResponse.redirect(new URL(`/${locale}/dashboard`, request.url))
    }
    return intlResponse
  }

  // Protected routes require authentication
  if (!token) {
    const url = new URL(`/${locale}/auth/login`, request.url)
    url.searchParams.set("callbackUrl", pathnameWithoutLocale)
    return NextResponse.redirect(url)
  }

  // Role-based access control
  const role = token.role as string

  // Admin routes
  if (pathnameWithoutLocale.startsWith("/admin") && role !== "ADMIN") {
    return NextResponse.redirect(new URL(`/${locale}/dashboard`, request.url))
  }

  // Landlord/Manager routes
  if (pathnameWithoutLocale.startsWith("/landlord") && !["LANDLORD", "MANAGER", "ADMIN"].includes(role)) {
    return NextResponse.redirect(new URL(`/${locale}/dashboard`, request.url))
  }

  // Tenant routes
  if (pathnameWithoutLocale.startsWith("/tenant") && role !== "TENANT" && role !== "ADMIN") {
    return NextResponse.redirect(new URL(`/${locale}/dashboard`, request.url))
  }

  return intlResponse
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
