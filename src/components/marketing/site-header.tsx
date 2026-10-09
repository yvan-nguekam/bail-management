import { getLocale, getTranslations } from "next-intl/server"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/dashboard/theme-toggle"
import { Link, getPathname } from "@/i18n/navigation"
import { Brand } from "./brand"
import { LocaleSwitcher } from "./locale-switcher"

export async function SiteHeader() {
  const [t, locale] = await Promise.all([getTranslations("landing.header"), getLocale()])

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-2 px-4 sm:px-6">
        <Brand
          href={getPathname({ href: "/", locale })}
          label={t("home")}
          wordmarkClassName="hidden min-[440px]:inline"
        />
        <nav aria-label={t("nav")} className="flex items-center gap-0.5 sm:gap-2">
          <LocaleSwitcher />
          {/* Theme toggle hidden on phones so the controls fit next to the brand */}
          <span className="hidden sm:inline-flex">
            <ThemeToggle />
          </span>
          <Button variant="ghost" className="px-2.5 sm:px-3" asChild>
            <Link href="/auth/login">{t("login")}</Link>
          </Button>
          <Button className="px-3 sm:px-4" asChild>
            <Link href="/auth/register">{t("getStarted")}</Link>
          </Button>
        </nav>
      </div>
    </header>
  )
}
