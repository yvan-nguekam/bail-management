"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AuthShell } from "@/components/auth/auth-shell"
import { Loader2, MailCheck } from "lucide-react"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [sentMessage, setSentMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })
      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        setError(data.error || "Une erreur est survenue. Réessayez.")
        return
      }

      setSentMessage(data.message)
    } catch {
      setError("Une erreur est survenue. Réessayez.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AuthShell
      title="Mot de passe oublié"
      description="Saisissez l'adresse e-mail de votre compte : nous vous enverrons un lien pour choisir un nouveau mot de passe."
      footer={
        <>
          Vous vous en souvenez ?{" "}
          <Link href="/auth/login" className="font-medium text-primary hover:underline">
            Se connecter
          </Link>
        </>
      }
    >
      {sentMessage ? (
        <div className="space-y-5" role="status">
          <div className="flex gap-3 rounded-xl border border-success/25 bg-success/10 p-4 text-sm">
            <MailCheck className="mt-0.5 h-5 w-5 shrink-0 text-success" aria-hidden />
            <div className="space-y-1">
              <p className="font-medium text-foreground">Vérifiez votre boîte de réception</p>
              <p className="text-muted-foreground">{sentMessage}</p>
              <p className="text-muted-foreground">Le lien est valable 1 heure.</p>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            className="h-11 w-full"
            onClick={() => setSentMessage(null)}
          >
            Utiliser une autre adresse
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5" aria-busy={isLoading}>
          <div className="space-y-2">
            <Label htmlFor="email">Adresse e-mail</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="vous@exemple.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isLoading}
              className="h-11"
            />
          </div>
          {error && (
            <p
              role="alert"
              className="rounded-lg border border-destructive/25 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              {error}
            </p>
          )}
          <Button type="submit" className="h-11 w-full" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                Envoi en cours…
              </>
            ) : (
              "Envoyer le lien"
            )}
          </Button>
        </form>
      )}
    </AuthShell>
  )
}
