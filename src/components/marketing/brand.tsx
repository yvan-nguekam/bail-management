import Link from "next/link"
import { Building2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface BrandProps {
  href?: string
  className?: string
  /** Classes for the wordmark, e.g. to hide it on the narrowest screens */
  wordmarkClassName?: string
}

/** Logo + wordmark, same treatment as the dashboard sidebar. */
export function Brand({ href = "/", className, wordmarkClassName }: BrandProps) {
  return (
    <Link href={href} className={cn("flex items-center gap-2.5", className)} aria-label="RentalManager, accueil">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <Building2 className="h-4 w-4" aria-hidden />
      </span>
      <span className={cn("text-base font-semibold tracking-tight", wordmarkClassName)}>RentalManager</span>
    </Link>
  )
}
