"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { userRoleLabel } from "@/lib/users"
import { CalendarDays, Loader2, Save, ShieldCheck, User } from "lucide-react"
import { toast } from "sonner"

export interface Profile {
  id: string
  name: string
  email: string
  phone: string | null
  role: string
  avatar: string | null
  createdAt: string
}

const profileSchema = z.object({
  name: z.string().trim().min(1, "Le nom est requis").max(100, "100 caractères maximum"),
  phone: z.string().trim().max(30, "30 caractères maximum"),
})

type ProfileFormData = z.infer<typeof profileSchema>

export function ProfileForm({ profile, onSaved }: { profile: Profile; onSaved: (p: Profile) => void }) {
  const router = useRouter()
  const { update } = useSession()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: profile.name, phone: profile.phone ?? "" },
  })

  const onSubmit = async (data: ProfileFormData) => {
    setIsSubmitting(true)
    try {
      const response = await fetch("/api/users/me", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Erreur lors de l'enregistrement")
      }
      const saved: Profile = await response.json()
      onSaved(saved)
      form.reset({ name: saved.name, phone: saved.phone ?? "" })
      // Met à jour le JWT (nom affiché dans l'en-tête) sans reconnexion
      await update({ name: saved.name })
      router.refresh()
      toast.success("Profil enregistré")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur lors de l'enregistrement")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Card className="animate-fade-up lg:col-span-2" style={{ "--stagger": 1 } as React.CSSProperties}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" aria-hidden />
            Informations personnelles
          </CardTitle>
          <CardDescription>Votre nom est visible par vos correspondants.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nom complet</FormLabel>
                    <FormControl>
                      <Input autoComplete="name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Téléphone</FormLabel>
                    <FormControl>
                      <Input type="tel" autoComplete="tel" placeholder="+237 6 00 00 00 00" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormItem>
                <FormLabel htmlFor="profile-email">Adresse e-mail</FormLabel>
                <Input id="profile-email" value={profile.email} readOnly disabled />
                <FormDescription>
                  L&apos;adresse e-mail sert d&apos;identifiant et ne peut pas être modifiée ici.
                </FormDescription>
              </FormItem>
              <div className="flex justify-end pt-2">
                <Button type="submit" disabled={isSubmitting || !form.formState.isDirty}>
                  {isSubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  ) : (
                    <Save className="h-4 w-4" aria-hidden />
                  )}
                  Enregistrer
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card className="animate-fade-up" style={{ "--stagger": 2 } as React.CSSProperties}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-muted-foreground" aria-hidden />
            Compte
          </CardTitle>
          <CardDescription>Informations gérées par l&apos;administration.</CardDescription>
        </CardHeader>
        <CardContent className="divide-y">
          <div className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted">
              <ShieldCheck className="h-4 w-4 text-muted-foreground" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Rôle</p>
              <div className="mt-1">
                <Badge variant="info">{userRoleLabel(profile.role)}</Badge>
              </div>
            </div>
          </div>
          <div className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted">
              <CalendarDays className="h-4 w-4 text-muted-foreground" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Membre depuis
              </p>
              <p className="mt-0.5 text-sm font-medium tabular-nums">
                {new Date(profile.createdAt).toLocaleDateString("fr-FR", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
