import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/dashboard/theme-toggle"
import { Brand } from "./brand"

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
        <Brand wordmarkClassName="hidden min-[400px]:inline" />
        <nav aria-label="Navigation principale" className="flex items-center gap-1 sm:gap-2">
          {/* Theme toggle hidden on phones so the three controls fit next to the brand */}
          <span className="hidden sm:inline-flex">
            <ThemeToggle />
          </span>
          <Button variant="ghost" className="px-3" asChild>
            <Link href="/auth/login">Connexion</Link>
          </Button>
          <Button className="px-3 sm:px-4" asChild>
            <Link href="/auth/register">Commencer</Link>
          </Button>
        </nav>
      </div>
    </header>
  )
}
