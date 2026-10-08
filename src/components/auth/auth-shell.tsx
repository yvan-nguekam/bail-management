import { Check } from "lucide-react"
import { Brand } from "@/components/marketing/brand"
import { ThemeToggle } from "@/components/dashboard/theme-toggle"

interface AuthShellProps {
  title: string
  description: string
  children: React.ReactNode
  /** Link row under the form (e.g. "Pas encore de compte ?") */
  footer?: React.ReactNode
}

const benefits = [
  "Biens, baux et locataires au même endroit",
  "Loyers suivis en FCFA, relances automatiques",
  "Contrats et quittances en PDF",
]

/** Two-column auth layout: brand panel on large screens, form on the right. */
export function AuthShell({ title, description, children, footer }: AuthShellProps) {
  return (
    <div className="grid min-h-dvh bg-background text-foreground lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      {/* Brand panel */}
      <aside className="hidden flex-col justify-between border-r bg-sidebar p-10 text-sidebar-foreground lg:flex">
        <Brand />
        <div className="animate-fade-up max-w-md">
          <h2 className="text-3xl font-semibold tracking-tight">
            La gestion locative, enfin simple.
          </h2>
          <ul className="mt-8 space-y-4">
            {benefits.map((item, i) => (
              <li
                key={item}
                className="animate-fade-up flex items-start gap-3 text-sm"
                style={{ "--stagger": i + 1 } as React.CSSProperties}
              >
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-success/10 text-success">
                  <Check className="h-3 w-3" aria-hidden />
                </span>
                {item}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-xs text-muted-foreground">
          © {new Date().getFullYear()} RentalManager
        </p>
      </aside>

      {/* Form column */}
      <div className="flex flex-col">
        <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:justify-end">
          <div className="lg:hidden">
            <Brand />
          </div>
          <ThemeToggle />
        </div>
        <main className="flex flex-1 items-center justify-center px-4 pb-12 pt-4 sm:px-6">
          <div className="animate-fade-up w-full max-w-sm">
            <div className="mb-8">
              <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
              <p className="mt-2 text-sm text-muted-foreground">{description}</p>
            </div>
            {children}
            {footer && (
              <p className="mt-8 text-center text-sm text-muted-foreground">{footer}</p>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
