"use client"

import { useEffect, useState } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PageHeader } from "@/components/shared/page-header"
import { ProfileForm, type Profile } from "@/components/settings/profile-form"
import { PasswordForm } from "@/components/settings/password-form"
import { PreferencesPanel } from "@/components/settings/preferences-panel"
import { KeyRound, SlidersHorizontal, User } from "lucide-react"
import { toast } from "sonner"

function SettingsSkeleton() {
  return (
    <div className="animate-fade-in space-y-6" aria-busy="true" aria-live="polite">
      <div className="space-y-2">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      <Skeleton className="h-9 w-72 rounded-lg" />
      <div className="grid gap-6 lg:grid-cols-3">
        <Skeleton className="h-80 rounded-xl lg:col-span-2" />
        <Skeleton className="h-56 rounded-xl" />
      </div>
    </div>
  )
}

export default function SettingsPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const response = await fetch("/api/users/me")
        if (!response.ok) throw new Error("Erreur lors du chargement du profil")
        setProfile(await response.json())
      } catch (error) {
        console.error("Erreur:", error)
        toast.error("Erreur lors du chargement du profil")
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) return <SettingsSkeleton />
  if (!profile) return null

  return (
    <div className="space-y-6">
      <PageHeader title="Paramètres" description="Votre profil, votre sécurité et vos préférences" />

      <Tabs defaultValue="profile" className="gap-6">
        <TabsList aria-label="Sections des paramètres" className="w-full sm:w-auto">
          <TabsTrigger value="profile">
            <User aria-hidden />
            Profil
          </TabsTrigger>
          <TabsTrigger value="security">
            <KeyRound aria-hidden />
            Sécurité
          </TabsTrigger>
          <TabsTrigger value="preferences">
            <SlidersHorizontal aria-hidden />
            Préférences
          </TabsTrigger>
        </TabsList>
        <TabsContent value="profile">
          <ProfileForm profile={profile} onSaved={setProfile} />
        </TabsContent>
        <TabsContent value="security">
          <PasswordForm />
        </TabsContent>
        <TabsContent value="preferences">
          <PreferencesPanel />
        </TabsContent>
      </Tabs>
    </div>
  )
}
