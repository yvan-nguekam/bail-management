import { uploadthingKeyFromUrl } from "@/lib/upload-config"

// Logique pure de gestion des photos d'un bien (retrait, réordonnancement).

export interface PropertyImageState {
  images: string[]
  imageKeys: string[]
}

/**
 * Retire une photo. La clé distante n'est renvoyée que si elle provient d'un envoi
 * Uploadthing de ce bien (présente dans imageKeys) : une URL saisie à la main ne
 * déclenche jamais de suppression chez Uploadthing.
 */
export function removePropertyImage(state: PropertyImageState, url: string) {
  if (!state.images.includes(url)) return null
  const key = uploadthingKeyFromUrl(url)
  const ownsKey = key !== null && state.imageKeys.includes(key)
  return {
    images: state.images.filter((image) => image !== url),
    imageKeys: ownsKey ? state.imageKeys.filter((k) => k !== key) : state.imageKeys,
    remoteKey: ownsKey ? key : null,
  }
}

/** Vrai si `next` contient exactement les mêmes photos que `current` (ordre libre). */
export function isSameImageSet(current: string[], next: string[]): boolean {
  if (current.length !== next.length) return false
  const a = [...current].sort()
  const b = [...next].sort()
  return a.every((value, i) => value === b[i])
}
