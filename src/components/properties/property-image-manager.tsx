"use client"

import { useEffect, useRef, useState } from "react"
import { ArrowLeft, ArrowRight, ImageIcon, Loader2, Star, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { FileDropzone } from "@/components/uploads/file-dropzone"
import { RemoteImage } from "@/components/uploads/remote-image"
import { MAX_PROPERTY_IMAGES } from "@/lib/upload-config"

interface PropertyImageManagerProps {
  propertyId: string
  propertyName: string
  initialImages: string[]
  className?: string
  style?: React.CSSProperties
}

/** Photos d'un bien : envoi, ordre (la première sert de couverture) et retrait. Enregistré immédiatement. */
export function PropertyImageManager({
  propertyId,
  propertyName,
  initialImages,
  className,
  style,
}: PropertyImageManagerProps) {
  const [images, setImages] = useState(initialImages)
  const [busy, setBusy] = useState(false)
  const [toRemove, setToRemove] = useState<string | null>(null)

  const cardRef = useRef<HTMLDivElement>(null)

  // Arrivée via « …/edit#photos » : la carte est rendue après le chargement des données,
  // le navigateur n'a donc pas pu y faire défiler la page.
  useEffect(() => {
    if (window.location.hash === "#photos") cardRef.current?.scrollIntoView({ block: "start" })
  }, [])

  const remaining = MAX_PROPERTY_IMAGES - images.length

  const reorder = async (next: string[]) => {
    const previous = images
    setImages(next)
    setBusy(true)
    try {
      const response = await fetch(`/api/properties/${propertyId}/images`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ images: next }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Erreur lors du réordonnancement")
      setImages(data.images)
    } catch (error) {
      setImages(previous)
      toast.error(error instanceof Error ? error.message : "Erreur lors du réordonnancement")
    } finally {
      setBusy(false)
    }
  }

  const move = (index: number, delta: number) => {
    const target = index + delta
    if (target < 0 || target >= images.length) return
    const next = [...images]
    ;[next[index], next[target]] = [next[target], next[index]]
    reorder(next)
  }

  const makeCover = (index: number) => {
    if (index === 0) return
    reorder([images[index], ...images.filter((_, i) => i !== index)])
  }

  const remove = async () => {
    if (!toRemove) return
    setBusy(true)
    try {
      const response = await fetch(`/api/properties/${propertyId}/images`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: toRemove }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Erreur lors du retrait")
      setImages(data.images)
      toast.success("Photo retirée")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur lors du retrait")
    } finally {
      setBusy(false)
      setToRemove(null)
    }
  }

  return (
    <Card ref={cardRef} id="photos" className={className} style={style}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ImageIcon className="h-4 w-4 text-muted-foreground" aria-hidden />
          Photos
          <span className="font-normal text-muted-foreground tabular-nums">
            ({images.length} / {MAX_PROPERTY_IMAGES})
          </span>
        </CardTitle>
        <CardDescription>
          Enregistrées immédiatement. La première photo sert de couverture dans la liste des biens.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {images.length > 0 && (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4" aria-busy={busy}>
            {images.map((src, i) => (
              <li key={src} className="overflow-hidden rounded-lg border bg-card">
                <div className="relative aspect-[4/3]">
                  <RemoteImage
                    src={src}
                    alt={`${propertyName} — photo ${i + 1}`}
                    className="h-full w-full"
                  />
                  {i === 0 && (
                    <Badge variant="info" className="absolute left-2 top-2 bg-background/90">
                      Couverture
                    </Badge>
                  )}
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon-sm"
                    className="absolute right-2 top-2 bg-background/90 text-destructive shadow-card hover:bg-background hover:text-destructive"
                    onClick={() => setToRemove(src)}
                    disabled={busy}
                    aria-label={`Retirer la photo ${i + 1}`}
                  >
                    <Trash2 className="h-4 w-4" aria-hidden />
                  </Button>
                </div>
                <div className="flex items-center justify-between gap-1 p-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => move(i, -1)}
                    disabled={busy || i === 0}
                    aria-label={`Déplacer la photo ${i + 1} vers la gauche`}
                  >
                    <ArrowLeft className="h-4 w-4" aria-hidden />
                  </Button>
                  {i > 0 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => makeCover(i)}
                      disabled={busy}
                      aria-label={`Utiliser la photo ${i + 1} comme couverture`}
                      title="Utiliser comme couverture"
                    >
                      <Star className="h-4 w-4" aria-hidden />
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => move(i, 1)}
                    disabled={busy || i === images.length - 1}
                    aria-label={`Déplacer la photo ${i + 1} vers la droite`}
                  >
                    <ArrowRight className="h-4 w-4" aria-hidden />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}

        {remaining > 0 ? (
          <FileDropzone
            endpoint="propertyImage"
            label="Glissez-déposez vos photos ici"
            getInput={() => ({ propertyId })}
            onUploaded={(results) => {
              setImages((prev) => [...prev, ...results.map((r) => r.serverData.url)])
              toast.success(results.length > 1 ? `${results.length} photos ajoutées` : "Photo ajoutée")
            }}
            disabled={busy}
          />
        ) : (
          <p className="text-sm text-muted-foreground">
            Limite de {MAX_PROPERTY_IMAGES} photos atteinte : retirez-en une pour en ajouter.
          </p>
        )}
      </CardContent>

      <AlertDialog open={toRemove !== null} onOpenChange={(open) => !open && setToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Retirer cette photo ?</AlertDialogTitle>
            <AlertDialogDescription>
              La photo ne sera plus affichée sur le bien. Si elle a été téléversée, le fichier est
              également supprimé.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                remove()
              }}
              disabled={busy}
              className={buttonVariants({ variant: "destructive" })}
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
              Retirer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}
