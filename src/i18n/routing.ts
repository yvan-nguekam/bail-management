import { defineRouting } from "next-intl/routing"

export const routing = defineRouting({
  locales: ["fr", "en"],
  defaultLocale: "fr",
  // Pas de préfixe pour la langue par défaut : /dashboard (fr), /en/dashboard (en)
  localePrefix: "as-needed",
})

export const locales = routing.locales
export type Locale = (typeof locales)[number]
export const defaultLocale: Locale = routing.defaultLocale

export function isLocale(value: string | undefined): value is Locale {
  return locales.includes(value as Locale)
}
