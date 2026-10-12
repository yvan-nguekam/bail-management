"use client"

import { useState } from "react"
import { ChevronLeft, ChevronRight, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { RemoteImage } from "./remote-image"

interface ImageGalleryProps {
  images: string[]
  /** Texte alternatif de base (« Photo 2 sur 5 » est ajouté) */
  alt: string
  /** "grid" : grille avec couverture mise en avant ; "thumbs" : petites vignettes */
  variant?: "grid" | "thumbs"
  className?: string
}

/** Grille de photos + visionneuse (Dialog) avec navigation clavier. */
export function ImageGallery({ images, alt, variant = "grid", className }: ImageGalleryProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null)
  if (images.length === 0) return null

  const count = images.length
  const current = openIndex ?? 0
  const go = (delta: number) => setOpenIndex((i) => ((i ?? 0) + delta + count) % count)
  const label = (i: number) => `${alt} — photo ${i + 1} sur ${count}`

  return (
    <>
      <ul
        className={cn(
          variant === "grid"
            ? "grid grid-cols-2 gap-2 sm:grid-cols-4"
            : "flex flex-wrap gap-2",
          className
        )}
      >
        {images.map((src, i) => (
          <li
            key={`${src}-${i}`}
            className={cn(
              variant === "grid" && i === 0 && count > 2 && "col-span-2 row-span-2",
              variant === "grid" && count === 1 && "col-span-2 sm:col-span-4"
            )}
          >
            <button
              type="button"
              onClick={() => setOpenIndex(i)}
              className={cn(
                "group block w-full overflow-hidden rounded-lg border bg-muted focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none",
                variant === "thumbs" ? "h-16 w-16 sm:h-20 sm:w-20" : "aspect-[4/3]",
                variant === "grid" && count === 1 && "aspect-[16/9] sm:aspect-[21/9]"
              )}
              aria-label={`Agrandir : ${label(i)}`}
            >
              <RemoteImage
                src={src}
                alt=""
                eager={i === 0 && variant === "grid"}
                className="h-full w-full transition-opacity duration-200 group-hover:opacity-90"
              />
            </button>
          </li>
        ))}
      </ul>

      <Dialog open={openIndex !== null} onOpenChange={(open) => !open && setOpenIndex(null)}>
        <DialogContent
          className="max-w-[calc(100%-2rem)] gap-3 p-3 sm:max-w-4xl sm:p-4"
          onKeyDown={(e) => {
            if (e.key === "ArrowRight") go(1)
            if (e.key === "ArrowLeft") go(-1)
          }}
        >
          <DialogTitle className="pr-8 text-sm font-medium tabular-nums">
            Photo {current + 1} sur {count}
          </DialogTitle>
          <DialogDescription className="sr-only">
            Utilisez les flèches gauche et droite pour naviguer entre les photos.
          </DialogDescription>
          <div className="relative flex items-center justify-center overflow-hidden rounded-lg bg-muted">
            {openIndex !== null && (
              <RemoteImage
                key={images[current]}
                src={images[current]}
                alt={label(current)}
                eager
                className="max-h-[70vh] w-auto max-w-full object-contain"
              />
            )}
            {count > 1 && (
              <>
                <Button
                  type="button"
                  variant="secondary"
                  size="icon"
                  className="absolute left-2 top-1/2 -translate-y-1/2 shadow-card"
                  onClick={() => go(-1)}
                  aria-label="Photo précédente"
                >
                  <ChevronLeft className="h-5 w-5" aria-hidden />
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="icon"
                  className="absolute right-2 top-1/2 -translate-y-1/2 shadow-card"
                  onClick={() => go(1)}
                  aria-label="Photo suivante"
                >
                  <ChevronRight className="h-5 w-5" aria-hidden />
                </Button>
              </>
            )}
          </div>
          <div className="flex justify-end">
            <Button variant="ghost" size="sm" asChild>
              <a href={images[current]} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4" aria-hidden />
                Ouvrir l&apos;original
              </a>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
