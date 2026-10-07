import Link from "next/link"
import { Brand } from "./brand"

export function SiteFooter() {
  return (
    <footer className="border-t">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <Brand />
        <nav aria-label="Liens de pied de page" className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
          <Link href="/auth/login" className="hover:text-foreground transition-colors">
            Se connecter
          </Link>
          <Link href="/auth/register" className="hover:text-foreground transition-colors">
            Créer un compte
          </Link>
        </nav>
        <p className="text-sm text-muted-foreground">
          © {new Date().getFullYear()} RentalManager. Tous droits réservés.
        </p>
      </div>
    </footer>
  )
}
