import { getLocale, getTranslations } from "next-intl/server"
import { Link, getPathname } from "@/i18n/navigation"
import { Brand } from "./brand"

export async function SiteFooter() {
  const [t, tHeader, locale] = await Promise.all([
    getTranslations("landing.footer"),
    getTranslations("landing.header"),
    getLocale(),
  ])

  return (
    <footer className="border-t">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <Brand href={getPathname({ href: "/", locale })} label={tHeader("home")} />
        <nav aria-label={t("nav")} className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
          <Link href="/auth/login" className="hover:text-foreground transition-colors">
            {t("login")}
          </Link>
          <Link href="/auth/register" className="hover:text-foreground transition-colors">
            {t("register")}
          </Link>
        </nav>
        <p className="text-sm text-muted-foreground">{t("rights", { year: new Date().getFullYear() })}</p>
      </div>
    </footer>
  )
}
