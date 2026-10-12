"use client"

import { useEffect, useId, useRef, useState } from "react"
import { AlertCircle, ImagePlus, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  UPLOAD_LIMITS,
  describeLimits,
  isUploadEnabled,
  validateFiles,
  type UploadEndpoint,
} from "@/lib/upload-config"
import { UploadDisabledNotice } from "./file-dropzone"

/** Aperçu d'un fichier local : URL objet créée et libérée par le même effet (sûr en StrictMode). */
function LocalPreview({ file, alt }: { file: File; alt: string }) {
  const ref = useRef<HTMLImageElement>(null)
  useEffect(() => {
    const url = URL.createObjectURL(file)
    if (ref.current) ref.current.src = url
    return () => URL.revokeObjectURL(url)
  }, [file])
  // eslint-disable-next-line @next/next/no-img-element
  return <img ref={ref} alt={alt} className="h-full w-full bg-muted object-cover" />
}

interface PendingImagesPickerProps {
  /** Route dont on applique les limites (types, taille, nombre) */
  endpoint: Extract<UploadEndpoint, "maintenanceImage" | "propertyImage">
  files: File[]
  onChange: (files: File[]) => void
  disabled?: boolean
  /** Masque l'encart « Upload non configuré » (ex. dans un fil de commentaires) */
  hideWhenDisabled?: boolean
  className?: string
}

/**
 * Sélection de photos envoyées plus tard (après création de la demande ou du commentaire).
 * Aperçus locaux, retrait, limites appliquées avant l'envoi.
 */
export function PendingImagesPicker({
  endpoint,
  files,
  onChange,
  disabled = false,
  hideWhenDisabled = false,
  className,
}: PendingImagesPickerProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const hintId = useId()
  const [error, setError] = useState<string | null>(null)
  const limits = UPLOAD_LIMITS[endpoint]


  if (!isUploadEnabled()) {
    return hideWhenDisabled ? null : <UploadDisabledNotice compact className={className} />
  }

  const add = (list: FileList | null) => {
    if (!list) return
    const next = [...files, ...Array.from(list)]
    const invalid = validateFiles(endpoint, next)
    setError(invalid)
    if (!invalid) onChange(next)
    if (inputRef.current) inputRef.current.value = ""
  }

  const full = files.length >= limits.maxFileCount

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex flex-wrap items-center gap-2">
        {files.map((file, i) => (
          <div key={`${file.name}-${i}`} className="relative h-16 w-16 overflow-hidden rounded-lg border">
            <LocalPreview file={file} alt={`Aperçu : ${file.name}`} />
            <button
              type="button"
              onClick={() => {
                setError(null)
                onChange(files.filter((_, j) => j !== i))
              }}
              disabled={disabled}
              className="absolute right-0.5 top-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-background/90 text-foreground shadow-card hover:bg-background focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
              aria-label={`Retirer ${file.name}`}
            >
              <X className="h-3.5 w-3.5" aria-hidden />
            </button>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => inputRef.current?.click()}
          disabled={disabled || full}
          aria-describedby={hintId}
        >
          <ImagePlus className="h-4 w-4" aria-hidden />
          {files.length ? "Ajouter" : "Joindre des photos"}
        </Button>
        <input
          ref={inputRef}
          type="file"
          className="sr-only"
          tabIndex={-1}
          accept={limits.accept.join(",")}
          multiple
          disabled={disabled || full}
          onChange={(e) => add(e.target.files)}
        />
      </div>
      <p id={hintId} className="text-xs text-muted-foreground">
        {describeLimits(endpoint)}
      </p>
      {error && (
        <p role="alert" className="flex items-start gap-2 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          {error}
        </p>
      )}
    </div>
  )
}
