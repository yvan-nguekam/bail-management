"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { Camera, Loader2, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { FileDropzone } from "@/components/uploads/file-dropzone"

function initials(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "?"
  )
}

interface AvatarCardProps {
  name: string
  avatar: string | null
  onChange: (avatar: string | null) => void
  style?: React.CSSProperties
}

/** Photo de profil : envoi (route Uploadthing "avatar") et retrait. L'en-tête est rafraîchi via le JWT. */
export function AvatarCard({ name, avatar, onChange, style }: AvatarCardProps) {
  const router = useRouter()
  const { update } = useSession()
  const [isRemoving, setIsRemoving] = useState(false)

  // Relit la photo en base dans le JWT (src/lib/auth.ts) pour mettre à jour l'en-tête
  const refreshSession = async () => {
    await update({ avatar: true })
    router.refresh()
  }

  const remove = async () => {
    setIsRemoving(true)
    try {
      const response = await fetch("/api/users/me/avatar", { method: "DELETE" })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Erreur lors du retrait")
      }
      onChange(null)
      await refreshSession()
      toast.success("Photo de profil retirée")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur lors du retrait")
    } finally {
      setIsRemoving(false)
    }
  }

  return (
    <Card className="animate-fade-up" style={style}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Camera className="h-4 w-4 text-muted-foreground" aria-hidden />
          Photo de profil
        </CardTitle>
        <CardDescription>Affichée dans l&apos;en-tête et auprès de vos correspondants.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16">
            {avatar && <AvatarImage src={avatar} alt="" className="object-cover" />}
            <AvatarFallback className="bg-primary/10 text-lg font-medium text-primary">
              {initials(name)}
            </AvatarFallback>
          </Avatar>
          {avatar ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-destructive hover:text-destructive"
              onClick={remove}
              disabled={isRemoving}
            >
              {isRemoving ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <Trash2 className="h-4 w-4" aria-hidden />
              )}
              Retirer
            </Button>
          ) : (
            <p className="text-sm text-muted-foreground">Aucune photo : vos initiales sont affichées.</p>
          )}
        </div>
        <FileDropzone
          endpoint="avatar"
          compact
          label={avatar ? "Remplacer la photo" : "Ajouter une photo"}
          getInput={() => undefined}
          disabled={isRemoving}
          onUploaded={async (results) => {
            const url = results[0]?.serverData.url
            if (!url) return
            onChange(url)
            await refreshSession()
            toast.success("Photo de profil mise à jour")
          }}
        />
      </CardContent>
    </Card>
  )
}
