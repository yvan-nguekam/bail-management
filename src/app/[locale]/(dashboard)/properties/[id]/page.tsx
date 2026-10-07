"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Pencil,
  Trash2,
  CalendarDays,
  BedDouble,
  Bath,
  Maximize,
  Wallet,
  ShieldCheck,
  User,
  Loader2,
  Wrench,
  FileText,
  Plus,
  Mail,
  Phone,
  ArrowUpRight,
} from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { PageHeader } from "@/components/shared/page-header";
import { PageSkeleton } from "@/components/shared/page-skeleton";
import { StatusBadge } from "@/components/shared/status-badge";
import { InfoItem, DetailRow } from "@/components/properties/info-item";
import { formatDay, propertyTypeLabel } from "@/components/properties/property-labels";
import { formatCurrency } from "@/lib/utils";

interface Property {
  id: string;
  name: string;
  address: string;
  city: string;
  postalCode: string;
  country: string;
  type: string;
  bedrooms: number;
  bathrooms: number;
  area: number;
  description: string;
  monthlyRent: number;
  securityDeposit: number;
  status: string;
  availableFrom: string;
  images: string[];
  amenities: string[];
  owner: {
    id: string;
    name: string;
    email: string;
    phone: string;
  };
  manager?: {
    id: string;
    name: string;
    email: string;
    phone: string;
  };
  leases: Array<{
    id: string;
    startDate: string;
    endDate: string;
    status: string;
    tenant: {
      id: string;
      name: string;
      email: string;
      phone: string;
    };
  }>;
  maintenanceRequests: Array<{
    id: string;
    title: string;
    status: string;
    priority: string;
    createdAt: string;
  }>;
}

export default function PropertyDetailsPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchProperty();
  }, [params.id]);

  const fetchProperty = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/properties/${params.id}`);

      if (!response.ok) {
        throw new Error("Propriété non trouvée");
      }

      const data = await response.json();
      setProperty(data);
    } catch (error) {
      console.error("Erreur:", error);
      toast.error("Erreur lors du chargement de la propriété");
      router.push("/properties");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/properties/${params.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erreur lors de la suppression");
      }

      toast.success("Propriété supprimée avec succès");
      router.push("/properties");
    } catch (error) {
      console.error("Erreur:", error);
      toast.error(
        error instanceof Error ? error.message : "Erreur lors de la suppression"
      );
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  if (loading) {
    return <PageSkeleton stats={0} />;
  }

  if (!property) {
    return null;
  }

  const activeLease = property.leases.find((lease) => lease.status === "ACTIVE");
  const otherLeases = property.leases.filter((lease) => lease.id !== activeLease?.id);

  return (
    <div className="space-y-6">
      <PageHeader
        title={property.name}
        description={`${property.address}, ${property.city}`}
        backHref="/properties"
        actions={
          <>
            {property.status === "AVAILABLE" && !activeLease && (
              <Button asChild>
                <Link href={`/leases/new?propertyId=${property.id}`}>
                  <Plus aria-hidden />
                  Nouveau bail
                </Link>
              </Button>
            )}
            <Button variant="outline" asChild>
              <Link href={`/properties/${property.id}/edit`}>
                <Pencil aria-hidden />
                Modifier
              </Link>
            </Button>
            <Button
              variant="outline"
              className="text-destructive hover:text-destructive"
              onClick={() => setDeleteDialogOpen(true)}
            >
              <Trash2 aria-hidden />
              Supprimer
            </Button>
          </>
        }
      >
        <StatusBadge kind="property" status={property.status} />
        <Badge variant="outline">{propertyTypeLabel(property.type)}</Badge>
      </PageHeader>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Informations principales */}
        <Card
          className="animate-fade-up lg:col-span-2"
          style={{ "--stagger": 1 } as React.CSSProperties}
        >
          <CardHeader>
            <CardTitle>Informations du bien</CardTitle>
            <CardDescription>
              Disponible à partir du {formatDay(property.availableFrom)}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-3">
              <InfoItem icon={BedDouble} label="Chambres" value={property.bedrooms} />
              <InfoItem icon={Bath} label="Salles de bain" value={property.bathrooms} />
              <InfoItem icon={Maximize} label="Surface" value={`${property.area} m²`} />
            </div>

            <Separator />

            <div className="grid gap-4 sm:grid-cols-2">
              <InfoItem
                icon={Wallet}
                label="Loyer mensuel"
                value={formatCurrency(property.monthlyRent)}
              />
              <InfoItem
                icon={ShieldCheck}
                label="Caution"
                value={formatCurrency(property.securityDeposit)}
                tone="default"
              />
            </div>

            {property.description && (
              <>
                <Separator />
                <div>
                  <h4 className="mb-2 text-sm font-semibold">Description</h4>
                  <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                    {property.description}
                  </p>
                </div>
              </>
            )}

            <Separator />

            <div>
              <h4 className="mb-3 text-sm font-semibold">Localisation</h4>
              <dl className="space-y-2">
                <DetailRow label="Adresse" value={property.address} />
                <DetailRow label="Ville" value={property.city} />
                <DetailRow label="Code postal" value={property.postalCode} />
                <DetailRow label="Pays" value={property.country} />
              </dl>
            </div>
          </CardContent>
        </Card>

        {/* Colonne latérale */}
        <div className="space-y-6">
          {/* Locataire actuel */}
          <Card className="animate-fade-up" style={{ "--stagger": 2 } as React.CSSProperties}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <User className="h-4 w-4 text-muted-foreground" aria-hidden />
                Locataire actuel
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {activeLease ? (
                <>
                  <div className="space-y-1">
                    <p className="font-semibold">{activeLease.tenant.name}</p>
                    <p className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Mail className="h-3.5 w-3.5 shrink-0" aria-hidden />
                      <span className="truncate">{activeLease.tenant.email}</span>
                    </p>
                    {activeLease.tenant.phone && (
                      <p className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Phone className="h-3.5 w-3.5 shrink-0" aria-hidden />
                        {activeLease.tenant.phone}
                      </p>
                    )}
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <span className="flex items-center gap-2 text-muted-foreground">
                      <CalendarDays className="h-3.5 w-3.5 shrink-0" aria-hidden />
                      Du {formatDay(activeLease.startDate)} au {formatDay(activeLease.endDate)}
                    </span>
                  </div>
                  <Button variant="outline" size="sm" className="w-full" asChild>
                    <Link href={`/leases/${activeLease.id}`}>
                      Voir le bail
                      <ArrowUpRight aria-hidden />
                    </Link>
                  </Button>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Aucun bail actif sur ce bien.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Propriétaire */}
          <Card className="animate-fade-up" style={{ "--stagger": 3 } as React.CSSProperties}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <User className="h-4 w-4 text-muted-foreground" aria-hidden />
                Propriétaire
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              <p className="font-semibold">{property.owner.name}</p>
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <Mail className="h-3.5 w-3.5 shrink-0" aria-hidden />
                <span className="truncate">{property.owner.email}</span>
              </p>
              {property.owner.phone && (
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Phone className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  {property.owner.phone}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Historique des baux */}
          {otherLeases.length > 0 && (
            <Card className="animate-fade-up" style={{ "--stagger": 4 } as React.CSSProperties}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <FileText className="h-4 w-4 text-muted-foreground" aria-hidden />
                  Autres baux
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="divide-y">
                  {otherLeases.map((lease) => (
                    <li key={lease.id}>
                      <Link
                        href={`/leases/${lease.id}`}
                        className="-mx-2 flex items-center justify-between gap-3 rounded-lg px-2 py-2.5 text-sm transition-colors hover:bg-muted/50"
                      >
                        <span className="min-w-0">
                          <span className="block truncate font-medium">{lease.tenant.name}</span>
                          <span className="block text-xs text-muted-foreground">
                            {formatDay(lease.startDate)} – {formatDay(lease.endDate)}
                          </span>
                        </span>
                        <StatusBadge kind="lease" status={lease.status} />
                      </Link>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Demandes de maintenance récentes */}
          {property.maintenanceRequests.length > 0 && (
            <Card className="animate-fade-up" style={{ "--stagger": 5 } as React.CSSProperties}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Wrench className="h-4 w-4 text-muted-foreground" aria-hidden />
                  Maintenance récente
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="divide-y">
                  {property.maintenanceRequests.map((request) => (
                    <li key={request.id}>
                      <Link
                        href={`/maintenance/${request.id}`}
                        className="-mx-2 flex items-center justify-between gap-3 rounded-lg px-2 py-2.5 text-sm transition-colors hover:bg-muted/50"
                      >
                        <span className="min-w-0">
                          <span className="block truncate font-medium">{request.title}</span>
                          <span className="block text-xs text-muted-foreground">
                            {new Date(request.createdAt).toLocaleDateString("fr-FR", {
                              timeZone: "UTC",
                            })}
                          </span>
                        </span>
                        <StatusBadge kind="maintenance" status={request.status} />
                      </Link>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Dialog de confirmation de suppression */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce bien ?</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer cette propriété ? Cette action
              est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              variant="destructive"
            >
              {isDeleting && <Loader2 className="animate-spin" aria-hidden />}
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
