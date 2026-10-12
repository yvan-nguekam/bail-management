import { UTApi } from "uploadthing/server"

// Accès serveur à Uploadthing : configuration et suppression des fichiers distants.

/** Envoi de fichiers configuré côté serveur (jeton présent). */
export function isUploadConfigured(): boolean {
  return Boolean(process.env.UPLOADTHING_TOKEN)
}

let utapi: UTApi | null = null

/**
 * Supprime des fichiers chez Uploadthing, au mieux : ne lève jamais d'erreur
 * (la suppression en base ne doit pas échouer à cause du stockage distant).
 */
export async function deleteRemoteFiles(keys: Array<string | null | undefined>): Promise<boolean> {
  const validKeys = keys.filter((key): key is string => Boolean(key))
  if (validKeys.length === 0 || !isUploadConfigured()) return false
  try {
    utapi ??= new UTApi({ token: process.env.UPLOADTHING_TOKEN })
    const result = await utapi.deleteFiles(validKeys)
    return result.success
  } catch (error) {
    console.error("Suppression Uploadthing impossible :", error)
    return false
  }
}
