"use client"

import { useLocale } from "next-intl"
import { useRouter, usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Languages } from "lucide-react"

export const languages = [
  { code: "fr", name: "Français", flag: "🇫🇷" },
  { code: "en", name: "English", flag: "🇺🇸" }
]

/** Same page in another locale ("as-needed" prefix: none for fr, /en/... otherwise). */
export function localizedPathname(pathname: string, newLocale: string) {
  const pathnameWithoutLocale = pathname.replace(/^\/(en|fr)(?=\/|$)/, "") || "/"
  return newLocale === "fr" ? pathnameWithoutLocale : `/${newLocale}${pathnameWithoutLocale}`
}

/** Shared by the header switcher and the settings page. */
export function useLanguageSwitch() {
  const locale = useLocale()
  const router = useRouter()
  const pathname = usePathname()

  const switchLanguage = (newLocale: string) => {
    router.push(localizedPathname(pathname, newLocale))
    router.refresh()
  }

  return { locale, switchLanguage }
}

export function LanguageSwitcher() {
  const { locale, switchLanguage } = useLanguageSwitch()

  const currentLanguage = languages.find(lang => lang.code === locale) || languages[0]

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          <Languages className="h-4 w-4" />
          <span className="hidden sm:inline">{currentLanguage.flag} {currentLanguage.name}</span>
          <span className="sm:hidden">{currentLanguage.flag}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {languages.map((language) => (
          <DropdownMenuItem
            key={language.code}
            onClick={() => switchLanguage(language.code)}
            className={locale === language.code ? "bg-accent" : ""}
          >
            <span className="mr-2">{language.flag}</span>
            {language.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
