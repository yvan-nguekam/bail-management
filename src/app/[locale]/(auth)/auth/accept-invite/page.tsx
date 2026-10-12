"use client"

import { Suspense, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { signIn } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { AuthShell } from "@/components/auth/auth-shell"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

const MIN_LENGTH = 8

interface InvitationInfo {
  email: string
  name: string
}

function InvalidInvitation({ message }: { message: string }) {
  return (
    <div className="space-y-5">
      <p
        role="alert"
        className="rounded-lg border border-destructive/25 bg-destructive/10 px-3 py-2 text-sm text-destructive"
      >
        {message}
      </p>
      <Button asChild variant="outline" className="h-11 w-full">
        <Link href="/auth/login">Aller à la connexion</Link>
      </Button>
    </div>
  )
}

function AcceptInviteForm() {
  const router = useRouter()
  const token = useSearchParams().get("token") ?? ""
  const [invitation, setInvitation] = useState<InvitationInfo | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [isChecking, setIsChecking] = useState(Boolean(token))
  const [name, setName] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!token) return
    let cancelled = false
    fetch(`/api/auth/accept-invite?token=${encodeURIComponent(token)}`)
      .then(async (response) => {
        const data = await response.json().catch(() => ({}))
        if (cancelled) return
        if (!response.ok) {
          setLoadError(data.error || "Cette invitation est invalide ou a expiré.")
          return
        }
        setInvitation(data)
        setName(data.name)
      })
      .catch(() => {
        if (!cancelled) setLoadError("Impossible de vérifier l'invitation. Réessayez.")
      })
      .finally(() => {
        if (!cancelled) setIsChecking(false)
      })
    return () => {
      cancelled = true
    }
  }, [token])

  if (!token) {
    return <InvalidInvitation message="Ce lien d'invitation est incomplet. Utilisez le lien reçu par e-mail." />
  }

  if (isChecking) {
    return (
      <div className="space-y-5" aria-busy>
        <Skeleton className="h-11 w-full" />
        <Skeleton className="h-11 w-full" />
        <Skeleton className="h-11 w-full" />
      </div>
    )
  }

  if (loadError || !invitation) {
    return <InvalidInvitation message={loadError ?? "Cette invitation est invalide ou a expiré."} />
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
      const response = await fetch("/api/auth/accept-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, name, password, confirmPassword }),
      })
      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        setError(data.error || "Une erreur est survenue. Réessayez.")
        return
      }

      // Connexion directe avec le mot de passe choisi
      const result = await signIn("credentials", {
        email: invitation.email,
        password,
        redirect: false,
      })
      if (result?.error) {
        toast.success("Compte créé. Connectez-vous pour continuer.")
        router.push("/auth/login")
        return
      }
      toast.success("Bienvenue ! Votre compte est prêt.")
      router.push("/dashboard")
      router.refresh()
    } catch {
      setError("Une erreur est survenue. Réessayez.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5" aria-busy={isLoading}>
      <div className="space-y-2">
        <Label htmlFor="email">Adresse e-mail</Label>
        <Input id="email" type="email" value={invitation.email} readOnly disabled className="h-11" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="name">Nom complet</Label>
        <Input
          id="name"
          type="text"
          autoComplete="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          maxLength={100}
          disabled={isLoading}
          className="h-11"
        />
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="password">Mot de passe</Label>
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
      </div>
      <p className="text-xs text-muted-foreground">Au moins {MIN_LENGTH} caractères.</p>
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
            Création du compte…
          </>
        ) : (
          "Créer mon compte"
        )}
      </Button>
    </form>
  )
}

export default function AcceptInvitePage() {
  return (
    <AuthShell
      title="Rejoindre RentalManager"
      description="Votre bailleur vous a invité : choisissez un mot de passe pour activer votre compte locataire."
      footer={
        <>
          Vous avez déjà un compte ?{" "}
          <Link href="/auth/login" className="font-medium text-primary hover:underline">
            Se connecter
          </Link>
        </>
      }
    >
      <Suspense fallback={<div className="h-64" aria-hidden />}>
        <AcceptInviteForm />
      </Suspense>
    </AuthShell>
  )
}
