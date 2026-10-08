import Link from "next/link";
import { Bath, BedDouble, MapPin, Maximize, Pencil } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/status-badge";
import { formatCurrency } from "@/lib/utils";
import { propertyTypeLabel } from "./property-labels";

export interface PropertyCardData {
  id: string;
  name: string;
  address: string;
  city: string;
  type: string;
  bedrooms: number;
  bathrooms: number;
  area: number;
  monthlyRent: number;
  status: string;
  leases: Array<{ tenant: { name: string } }>;
}

interface PropertyCardProps {
  property: PropertyCardData;
  /** Décalage de l'animation d'entrée dans la grille */
  index?: number;
}

/** Carte de la grille des biens : lien étendu sur toute la carte, bouton Modifier séparé. */
export function PropertyCard({ property, index = 0 }: PropertyCardProps) {
  const tenant = property.leases[0]?.tenant.name;

  return (
    <Card
      className="group relative animate-fade-up gap-4 py-5 transition-[box-shadow,border-color] hover:border-primary/40 hover:shadow-card-hover has-[a:focus-visible]:border-ring"
      style={{ "--stagger": index } as React.CSSProperties}
    >
      <div className="flex items-start justify-between gap-3 px-5">
        <div className="min-w-0">
          <h3 className="truncate font-semibold leading-tight">
            <Link
              href={`/properties/${property.id}`}
              className="outline-none after:absolute after:inset-0 after:rounded-xl"
            >
              {property.name}
            </Link>
          </h3>
          <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
            <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
            <span className="truncate">
              {property.address}, {property.city}
            </span>
          </p>
        </div>
        <StatusBadge kind="property" status={property.status} />
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 text-sm text-muted-foreground">
        <span>{propertyTypeLabel(property.type)}</span>
        <span className="flex items-center gap-1 tabular-nums">
          <BedDouble className="h-3.5 w-3.5" aria-hidden />
          {property.bedrooms}
          <span className="sr-only"> chambres</span>
        </span>
        <span className="flex items-center gap-1 tabular-nums">
          <Bath className="h-3.5 w-3.5" aria-hidden />
          {property.bathrooms}
          <span className="sr-only"> salles de bain</span>
        </span>
        <span className="flex items-center gap-1 tabular-nums">
          <Maximize className="h-3.5 w-3.5" aria-hidden />
          {property.area} m²
        </span>
      </div>

      <div className="flex items-end justify-between gap-3 border-t px-5 pt-4">
        <div className="min-w-0">
          <p className="font-semibold tabular-nums">
            {formatCurrency(property.monthlyRent)}
            <span className="text-xs font-normal text-muted-foreground"> / mois</span>
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {tenant ? `Locataire : ${tenant}` : "Aucun locataire"}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="relative z-10 shrink-0 text-muted-foreground"
          asChild
        >
          <Link href={`/properties/${property.id}/edit`} aria-label={`Modifier ${property.name}`}>
            <Pencil />
          </Link>
        </Button>
      </div>
    </Card>
  );
}
