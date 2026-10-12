import { generateReactHelpers } from "@uploadthing/react"
import type { inferEndpointInput, inferEndpointOutput } from "uploadthing/types"
import type { OurFileRouter } from "@/app/api/uploadthing/core"

// Helpers client typés avec le FileRouter. On utilise `uploadFiles` (et non les composants
// UploadButton / UploadDropzone d'Uploadthing) : l'interface est construite avec nos tokens
// (src/components/uploads/file-dropzone.tsx), sans la feuille de styles Uploadthing, et aucune
// requête de configuration n'est faite tant que l'envoi est désactivé.
export const { uploadFiles } = generateReactHelpers<OurFileRouter>()

export type UploadRoute = keyof OurFileRouter
export type UploadInput<E extends UploadRoute> = inferEndpointInput<OurFileRouter[E]>
export type UploadOutput<E extends UploadRoute> = inferEndpointOutput<OurFileRouter[E]>

export interface UploadResult<E extends UploadRoute> {
  name: string
  url: string
  serverData: UploadOutput<E>
}

/** Envoie des fichiers vers une route du FileRouter et renvoie les données de `onUploadComplete`. */
export async function startUpload<E extends UploadRoute>(
  endpoint: E,
  files: File[],
  input: UploadInput<E>,
  onProgress?: (percent: number) => void
): Promise<UploadResult<E>[]> {
  // `uploadFiles` est typé route par route ; l'appel générique passe par ce cast localisé.
  const upload = uploadFiles as unknown as (
    slug: E,
    opts: {
      files: File[]
      input?: UploadInput<E>
      onUploadProgress?: (p: { totalProgress: number }) => void
    }
  ) => Promise<Array<{ name: string; ufsUrl: string; serverData: UploadOutput<E> }>>

  const results = await upload(endpoint, {
    files,
    input: input ?? undefined,
    onUploadProgress: ({ totalProgress }) => onProgress?.(totalProgress),
  })
  return results.map((r) => ({ name: r.name, url: r.ufsUrl, serverData: r.serverData }))
}

/** Message d'erreur affichable (français) à partir d'une erreur d'envoi. */
export function uploadErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : ""
  if (!message) return "L'envoi a échoué. Réessayez."
  if (/not configured|non configuré|503/i.test(message)) return "Upload non configuré"
  if (/too large|FileSizeMismatch|exceeds/i.test(message)) return "Fichier trop volumineux."
  if (/file type|InvalidFileType|not allowed/i.test(message)) return "Format de fichier non accepté."
  if (/too many|FileCountMismatch/i.test(message)) return "Trop de fichiers pour cet envoi."
  if (/failed to fetch|network/i.test(message)) return "Connexion impossible. Vérifiez votre réseau."
  // Les refus métier du serveur sont déjà en français
  return message
}
