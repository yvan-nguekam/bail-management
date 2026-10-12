import { cn } from "@/lib/utils"

/**
 * Image distante (Uploadthing ou URL saisie à la main).
 * <img> natif plutôt que next/image : les URL peuvent venir de n'importe quel hôte
 * (anciennes photos ajoutées par lien), Uploadthing sert déjà les fichiers via son CDN,
 * et on évite de solliciter l'optimisation d'images de l'hébergeur pour chaque vignette.
 */
export function RemoteImage({
  src,
  alt,
  className,
  eager = false,
}: {
  src: string
  alt: string
  className?: string
  /** Image au-dessus de la ligne de flottaison (couverture) */
  eager?: boolean
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      loading={eager ? "eager" : "lazy"}
      decoding="async"
      referrerPolicy="no-referrer"
      className={cn("bg-muted object-cover text-transparent", className)}
    />
  )
}
