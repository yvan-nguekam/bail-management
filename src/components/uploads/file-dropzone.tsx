"use client"

import { useId, useRef, useState } from "react"
import { AlertCircle, CloudOff, Loader2, UploadCloud } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  UPLOAD_LIMITS,
  describeLimits,
  isUploadEnabled,
  validateFiles,
} from "@/lib/upload-config"
import {
  startUpload,
  uploadErrorMessage,
  type UploadInput,
  type UploadResult,
  type UploadRoute,
} from "@/lib/uploadthing"

interface FileDropzoneProps<E extends UploadRoute> {
  endpoint: E
  /**
   * Données envoyées à la route (bien, bail…), lues au moment du dépôt.
   * Renvoyer null annule l'envoi (ex. formulaire incomplet).
   */
  getInput: () => UploadInput<E> | null | Promise<UploadInput<E> | null>
  onUploaded: (results: UploadResult<E>[]) => void | Promise<void>
  /** Titre de la zone (ex. « Déposez vos photos ») */
  label?: string
  /** Complément affiché quand l'envoi n'est pas configuré */
  disabledHint?: string
  disabled?: boolean
  /** Zone plus compacte (avatar, commentaires) */
  compact?: boolean
  className?: string
}

/**
 * Zone de dépôt de fichiers (glisser-déposer ou sélection) avec progression et erreurs en français.
 * Sans UPLOADTHING_TOKEN au build, affiche l'état « Upload non configuré » et n'appelle jamais le serveur.
 */
export function FileDropzone<E extends UploadRoute>(props: FileDropzoneProps<E>) {
  if (!isUploadEnabled()) {
    return (
      <UploadDisabledNotice hint={props.disabledHint} compact={props.compact} className={props.className} />
    )
  }
  return <ActiveDropzone {...props} />
}

export function UploadDisabledNotice({
  hint,
  compact,
  className,
}: {
  hint?: string
  compact?: boolean
  className?: string
}) {
  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-xl border border-dashed bg-muted/40 text-left",
        compact ? "px-3 py-3" : "px-4 py-5",
        className
      )}
      role="status"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted">
        <CloudOff className="h-4 w-4 text-muted-foreground" aria-hidden />
      </span>
      <div className="min-w-0 space-y-0.5">
        <p className="text-sm font-medium">Upload non configuré</p>
        <p className="text-sm text-muted-foreground">
          L&apos;envoi de fichiers n&apos;est pas activé sur cette installation.
          {hint ? ` ${hint}` : ""}
        </p>
      </div>
    </div>
  )
}

function ActiveDropzone<E extends UploadRoute>({
  endpoint,
  getInput,
  onUploaded,
  label,
  disabled = false,
  compact = false,
  className,
}: FileDropzoneProps<E>) {
  const inputId = useId()
  const hintId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [progress, setProgress] = useState<number | null>(null)
  const [uploadingNames, setUploadingNames] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)

  const limits = UPLOAD_LIMITS[endpoint]
  const isUploading = progress !== null
  const isDisabled = disabled || isUploading
  const multiple = limits.maxFileCount > 1

  const handleFiles = async (fileList: FileList | null) => {
    if (!fileList || isDisabled) return
    const files = Array.from(fileList)
    setError(null)

    const invalid = validateFiles(endpoint, files)
    if (invalid) {
      setError(invalid)
      return
    }

    const input = await getInput()
    if (input === null) return

    setUploadingNames(files.map((f) => f.name))
    setProgress(0)
    try {
      const results = await startUpload(endpoint, files, input, setProgress)
      await onUploaded(results)
    } catch (err) {
      setError(uploadErrorMessage(err))
    } finally {
      setProgress(null)
      setUploadingNames([])
      if (inputRef.current) inputRef.current.value = ""
    }
  }

  return (
    <div className={cn("space-y-2", className)}>
      <div
        onDragOver={(e) => {
          e.preventDefault()
          if (!isDisabled) setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragging(false)
          handleFiles(e.dataTransfer.files)
        }}
        aria-busy={isUploading}
        className={cn(
          "flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed text-center transition-colors",
          compact ? "px-4 py-4" : "px-6 py-8",
          dragging ? "border-primary bg-primary/5" : "border-input bg-muted/30",
          isDisabled && !isUploading && "opacity-60"
        )}
      >
        {isUploading ? (
          <div className="w-full max-w-sm space-y-2" aria-live="polite">
            <p className="flex items-center justify-center gap-2 text-sm font-medium">
              <Loader2 className="h-4 w-4 animate-spin text-primary" aria-hidden />
              Envoi en cours… <span className="tabular-nums">{Math.round(progress ?? 0)} %</span>
            </p>
            <div
              role="progressbar"
              aria-label="Progression de l'envoi"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(progress ?? 0)}
              className="h-2 w-full overflow-hidden rounded-full bg-muted"
            >
              <div
                className="h-full rounded-full bg-primary transition-[width] duration-200"
                style={{ width: `${Math.max(progress ?? 0, 3)}%` }}
              />
            </div>
            <p className="truncate text-xs text-muted-foreground">{uploadingNames.join(", ")}</p>
          </div>
        ) : (
          <>
            {!compact && (
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <UploadCloud className="h-5 w-5 text-primary" aria-hidden />
              </span>
            )}
            <p className="text-sm font-medium">
              {label ?? (multiple ? "Glissez-déposez vos fichiers ici" : "Glissez-déposez un fichier ici")}
            </p>
            <p id={hintId} className="text-xs text-muted-foreground">
              {describeLimits(endpoint)}
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-1"
              disabled={isDisabled}
              onClick={() => inputRef.current?.click()}
              aria-describedby={hintId}
            >
              {compact && <UploadCloud className="h-4 w-4" aria-hidden />}
              {multiple ? "Choisir des fichiers" : "Choisir un fichier"}
            </Button>
          </>
        )}
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          className="sr-only"
          tabIndex={-1}
          accept={limits.accept.join(",")}
          multiple={multiple}
          disabled={isDisabled}
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>
      {error && (
        <p role="alert" className="flex items-start gap-2 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          {error}
        </p>
      )}
    </div>
  )
}
