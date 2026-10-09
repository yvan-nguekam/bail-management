"use client"

import { Check, Languages } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { languages } from "@/components/dashboard/language-switcher"
import { Link, usePathname } from "@/i18n/navigation"

/**
 * Compact language menu for the marketing header.
 * Uses next-intl's Link with `locale` so the NEXT_LOCALE cookie follows the choice
 * (otherwise "/" would redirect back to "/en" after visiting the English page).
 */
export function LocaleSwitcher() {
  const t = useTranslations("landing.header")
  const locale = useLocale()
  const pathname = usePathname()
  const current = languages.find((l) => l.code === locale) ?? languages[0]

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="gap-1.5 px-2.5" aria-label={t("language", { language: current.name })}>
          <Languages className="h-4 w-4" aria-hidden />
          <span className="text-xs font-semibold uppercase">{current.code}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-36">
        {languages.map((language) => (
          <DropdownMenuItem key={language.code} asChild>
            <Link
              href={pathname}
              locale={language.code}
              lang={language.code}
              hrefLang={language.code}
              aria-current={language.code === locale ? "true" : undefined}
              className="flex items-center justify-between gap-3"
            >
              {language.name}
              {language.code === locale && <Check className="h-4 w-4 text-primary" aria-hidden />}
            </Link>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
