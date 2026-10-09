import { createNavigation } from "next-intl/navigation"
import { routing } from "./routing"

// Locale-aware navigation helpers ("as-needed" prefix: /auth/login in fr, /en/auth/login in en).
// A Link with a `locale` prop also keeps the NEXT_LOCALE cookie in sync when switching languages.
export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation(routing)
