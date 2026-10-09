"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AuthShell } from "@/components/auth/auth-shell"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

export default function LoginPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setFormError(null)

    try {
      const result = await signIn("credentials", {
        email: formData.email,
        password: formData.password,
        redirect: false,
      })

      if (result?.error === "RATE_LIMITED") {
        setFormError(
          "Trop de tentatives de connexion. Réessayez dans 15 minutes ou réinitialisez votre mot de passe."
        )
      } else if (result?.error) {
        setFormError("Adresse e-mail ou mot de passe incorrect.")
      } else {
        toast.success("Content de vous revoir !")
        router.push("/dashboard")
        router.refresh()
      }
    } catch {
      toast.error("Une erreur est survenue")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AuthShell
      title="Connexion"
      description="Connectez-vous pour accéder à votre tableau de bord."
      footer={
        <>
          Pas encore de compte ?{" "}
          <Link href="/auth/register" className="font-medium text-primary hover:underline">
            Créer un compte
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5" aria-busy={isLoading}>
        <div className="space-y-2">
          <Label htmlFor="email">Adresse e-mail</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="vous@exemple.com"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            required
            disabled={isLoading}
            className="h-11"
          />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Mot de passe</Label>
            <Link
              href="/auth/forgot-password"
              className="text-sm text-primary hover:underline"
            >
              Mot de passe oublié ?
            </Link>
          </div>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            required
            disabled={isLoading}
            className="h-11"
          />
        </div>
        {formError && (
          <p
            role="alert"
            className="rounded-lg border border-destructive/25 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            {formError}
          </p>
        )}
        <Button type="submit" className="h-11 w-full" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              Connexion en cours…
            </>
          ) : (
            "Se connecter"
          )}
        </Button>
      </form>
    </AuthShell>
  )
}
