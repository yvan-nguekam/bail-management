"use client"

import { useEffect, useId, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  CATEGORY_FIELD,
  EMAIL_CATEGORIES,
  EMAIL_CATEGORY_LABELS,
  type EmailPreferences,
} from "@/lib/notification-preferences"
import { cn } from "@/lib/utils"
import { Mail } from "lucide-react"
import { toast } from "sonner"

function Switch({
  checked,
  disabled,
  onCheckedChange,
  labelId,
  descriptionId,
}: {
  checked: boolean
  disabled?: boolean
  onCheckedChange: (checked: boolean) => void
  labelId: string
  descriptionId: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-labelledby={labelId}
      aria-describedby={descriptionId}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border-2 border-transparent transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        checked ? "bg-primary" : "bg-input"
      )}
    >
      <span
        aria-hidden
        className={cn(
          "pointer-events-none block h-5 w-5 rounded-full bg-background shadow-sm transition-transform",
          checked ? "translate-x-5" : "translate-x-0"
        )}
      />
    </button>
  )
}

function PreferenceRow({
  label,
  description,
  checked,
  disabled,
  onChange,
}: {
  label: string
  description: string
  checked: boolean
  disabled?: boolean
  onChange: (checked: boolean) => void
}) {
  const id = useId()
  return (
    <div className="flex min-h-11 items-center justify-between gap-4 py-3">
      <div className="space-y-0.5">
        <p id={`${id}-label`} className="text-sm font-medium">
          {label}
        </p>
        <p id={`${id}-description`} className="text-sm text-muted-foreground">
          {description}
        </p>
      </div>
      <Switch
        checked={checked}
        disabled={disabled}
        onCheckedChange={onChange}
        labelId={`${id}-label`}
        descriptionId={`${id}-description`}
      />
    </div>
  )
}

export function NotificationPreferencesPanel() {
  const [preferences, setPreferences] = useState<EmailPreferences | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch("/api/users/me/notification-preferences")
      .then((response) => {
        if (!response.ok) throw new Error("Erreur lors du chargement des préférences")
        return response.json()
      })
      .then(setPreferences)
      .catch((error) => {
        console.error("Erreur:", error)
        toast.error("Erreur lors du chargement des préférences")
      })
  }, [])

  const update = async (field: keyof EmailPreferences, value: boolean) => {
    if (!preferences) return
    const previous = preferences
    setPreferences({ ...preferences, [field]: value })
    setSaving(true)
    try {
      const response = await fetch("/api/users/me/notification-preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value }),
      })
      if (!response.ok) throw new Error("Erreur lors de l'enregistrement")
      setPreferences(await response.json())
      toast.success("Préférences enregistrées")
    } catch (error) {
      console.error("Erreur:", error)
      setPreferences(previous)
      toast.error("Erreur lors de l'enregistrement des préférences")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card className="animate-fade-up max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-4 w-4 text-muted-foreground" aria-hidden />
          Notifications par e-mail
        </CardTitle>
        <CardDescription>
          Les notifications restent toujours visibles dans l&apos;application ; ces réglages ne
          concernent que les e-mails.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {preferences ? (
          <div className="divide-y divide-border">
            <PreferenceRow
              label="Recevoir des e-mails"
              description="Interrupteur général pour tous les e-mails de notification."
              checked={preferences.emailNotifications}
              disabled={saving}
              onChange={(value) => update("emailNotifications", value)}
            />
            {EMAIL_CATEGORIES.map((category) => {
              const field = CATEGORY_FIELD[category]
              return (
                <PreferenceRow
                  key={category}
                  label={EMAIL_CATEGORY_LABELS[category].label}
                  description={EMAIL_CATEGORY_LABELS[category].description}
                  checked={preferences.emailNotifications && preferences[field]}
                  disabled={saving || !preferences.emailNotifications}
                  onChange={(value) => update(field, value)}
                />
              )
            })}
          </div>
        ) : (
          <div className="space-y-3" aria-busy="true">
            {Array.from({ length: 5 }, (_, i) => (
              <Skeleton key={i} className="h-12 rounded-lg" />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
