"use client"

import { Suspense, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AuthShell } from "@/components/auth/auth-shell"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

const MIN_LENGTH = 8

function ResetPasswordForm() {
  const router = useRouter()
  const token = useSearchParams().get("token") ?? ""
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!token) {
    return (
      <div className="space-y-5">
        <p
          role="alert"
          className="rounded-lg border border-destructive/25 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          Ce lien de réinitialisation est incomplet. Utilisez le lien reçu par e-mail ou faites
          une nouvelle demande.
        </p>
        <Button asChild className="h-11 w-full">
          <Link href="/auth/forgot-password">Demander un nouveau lien</Link>
        </Button>
      </div>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (password.length < MIN_LENGTH) {
      setError(`Le mot de passe doit contenir au moins ${MIN_LENGTH} caractères.`)
      return
    }
    if (password !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas.")
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password, confirmPassword }),
      })
      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        setError(data.error || "Une erreur est survenue. Réessayez.")
        return
      }

      toast.success("Mot de passe modifié. Connectez-vous avec le nouveau mot de passe.")
      router.push("/auth/login")
    } catch {
      setError("Une erreur est survenue. Réessayez.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5" aria-busy={isLoading}>
      <div className="space-y-2">
        <Label htmlFor="password">Nouveau mot de passe</Label>
        <Input
          id="password"
          type="password"
          autoComplete="new-password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={MIN_LENGTH}
          disabled={isLoading}
          className="h-11"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirmation</Label>
        <Input
          id="confirmPassword"
          type="password"
          autoComplete="new-password"
          placeholder="••••••••"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          disabled={isLoading}
          className="h-11"
        />
      </div>
      <p className="text-xs text-muted-foreground">
        Au moins {MIN_LENGTH} caractères. Vos autres sessions seront déconnectées.
      </p>
      {error && (
        <div
          role="alert"
          className="space-y-1 rounded-lg border border-destructive/25 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          <p>{error}</p>
          {/invalide|expiré/.test(error) && (
            <Link href="/auth/forgot-password" className="font-medium underline">
              Demander un nouveau lien
            </Link>
          )}
        </div>
      )}
      <Button type="submit" className="h-11 w-full" disabled={isLoading}>
        {isLoading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            Enregistrement…
          </>
        ) : (
          "Enregistrer le mot de passe"
        )}
      </Button>
    </form>
  )
}

export default function ResetPasswordPage() {
  return (
    <AuthShell
      title="Nouveau mot de passe"
      description="Choisissez le nouveau mot de passe de votre compte."
      footer={
        <>
          Retour à la{" "}
          <Link href="/auth/login" className="font-medium text-primary hover:underline">
            connexion
          </Link>
        </>
      }
    >
      <Suspense fallback={<div className="h-64" aria-hidden />}>
        <ResetPasswordForm />
      </Suspense>
    </AuthShell>
  )
}
