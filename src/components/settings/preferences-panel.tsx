"use client"

import { useSyncExternalStore } from "react"
import { useTheme } from "next-themes"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { languages, useLanguageSwitch } from "@/components/dashboard/language-switcher"
import { cn } from "@/lib/utils"
import { Check, Languages, Monitor, Moon, Palette, Sun } from "lucide-react"

const themeOptions = [
  { value: "light", label: "Clair", icon: Sun },
  { value: "dark", label: "Sombre", icon: Moon },
  { value: "system", label: "Système", icon: Monitor },
] as const

function OptionButton({
  selected,
  onClick,
  children,
  label,
}: {
  selected: boolean
  onClick: () => void
  children: React.ReactNode
  label: string
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      aria-label={label}
      onClick={onClick}
      className={cn(
        "flex min-h-11 items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors",
        selected
          ? "border-primary bg-primary/10 text-primary"
          : "border-border text-foreground hover:bg-accent"
      )}
    >
      {children}
      {selected && <Check className="ml-auto h-4 w-4" aria-hidden />}
    </button>
  )
}

export function PreferencesPanel() {
  const { theme, setTheme } = useTheme()
  const { locale, switchLanguage } = useLanguageSwitch()
  // next-themes ne connaît le thème qu'après l'hydratation : squelette côté serveur
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  )

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card className="animate-fade-up" style={{ "--stagger": 1 } as React.CSSProperties}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-4 w-4 text-muted-foreground" aria-hidden />
            Apparence
          </CardTitle>
          <CardDescription>Mémorisé sur cet appareil.</CardDescription>
        </CardHeader>
        <CardContent>
          {mounted ? (
            <div role="radiogroup" aria-label="Thème" className="grid gap-2 sm:grid-cols-3">
              {themeOptions.map(({ value, label, icon: Icon }) => (
                <OptionButton
                  key={value}
                  selected={theme === value}
                  onClick={() => setTheme(value)}
                  label={`Thème ${label.toLowerCase()}`}
                >
                  <Icon className="h-4 w-4" aria-hidden />
                  {label}
                </OptionButton>
              ))}
            </div>
          ) : (
            <div className="grid gap-2 sm:grid-cols-3" aria-busy="true">
              {themeOptions.map((o) => (
                <Skeleton key={o.value} className="h-11 rounded-lg" />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="animate-fade-up" style={{ "--stagger": 2 } as React.CSSProperties}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Languages className="h-4 w-4 text-muted-foreground" aria-hidden />
            Langue
          </CardTitle>
          <CardDescription>Langue de l&apos;interface.</CardDescription>
        </CardHeader>
        <CardContent>
          <div role="radiogroup" aria-label="Langue" className="grid gap-2 sm:grid-cols-2">
            {languages.map((language) => (
              <OptionButton
                key={language.code}
                selected={locale === language.code}
                onClick={() => switchLanguage(language.code)}
                label={language.name}
              >
                <span aria-hidden>{language.flag}</span>
                {language.name}
              </OptionButton>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
