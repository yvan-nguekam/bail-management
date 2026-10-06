"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  Edit,
  Trash2,
  Building2,
  MapPin,
  Calendar,
  BedDouble,
  Bath,
  Maximize,
  DollarSign,
  User,
  Loader2,
  AlertCircle,
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

const propertyTypeLabels: Record<string, string> = {
  APARTMENT: "Appartement",
  HOUSE: "Maison",
  STUDIO: "Studio",
  COMMERCIAL: "Commercial",
  OFFICE: "Bureau",
  OTHER: "Autre",
};

const statusLabels: Record<string, string> = {
  AVAILABLE: "Disponible",
  OCCUPIED: "Occupé",
  MAINTENANCE: "Maintenance",
  UNAVAILABLE: "Indisponible",
};

const statusColors: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  AVAILABLE: "default",
  OCCUPIED: "secondary",
  MAINTENANCE: "outline",
  UNAVAILABLE: "destructive",
};

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
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!property) {
    return null;
  }

  const activeLease = property.leases.find((lease) => lease.status === "ACTIVE");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{property.name}</h1>
            <div className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="h-4 w-4" />
              <span>
                {property.address}, {property.city}
              </span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => router.push(`/properties/${property.id}/edit`)}
          >
            <Edit className="mr-2 h-4 w-4" />
            Modifier
          </Button>
          <Button
            variant="destructive"
            onClick={() => setDeleteDialogOpen(true)}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Supprimer
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Informations principales */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Informations de la propriété
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-wrap gap-2">
              <Badge variant={statusColors[property.status]} className="text-sm">
                {statusLabels[property.status]}
              </Badge>
              <Badge variant="outline" className="text-sm">
                {propertyTypeLabels[property.type]}
              </Badge>
            </div>

            {property.description && (
              <div>
                <h4 className="font-semibold mb-2">Description</h4>
                <p className="text-muted-foreground">{property.description}</p>
              </div>
            )}

            <Separator />

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <BedDouble className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Chambres</p>
                  <p className="font-semibold">{property.bedrooms}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Bath className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Salles de bain</p>
                  <p className="font-semibold">{property.bathrooms}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Maximize className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Surface</p>
                  <p className="font-semibold">{property.area} m²</p>
                </div>
              </div>
            </div>

            <Separator />

            <div>
              <h4 className="font-semibold mb-3">Localisation</h4>
              <div className="space-y-2 text-sm">
                <p>
                  <span className="text-muted-foreground">Adresse: </span>
                  {property.address}
                </p>
                <p>
                  <span className="text-muted-foreground">Ville: </span>
                  {property.city}
                </p>
                <p>
                  <span className="text-muted-foreground">Code postal: </span>
                  {property.postalCode}
                </p>
                <p>
                  <span className="text-muted-foreground">Pays: </span>
                  {property.country}
                </p>
              </div>
            </div>

            <Separator />

            <div>
              <h4 className="font-semibold mb-3">Informations financières</h4>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-500/10 rounded-lg">
                    <DollarSign className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Loyer mensuel</p>
                    <p className="font-semibold">
                      {property.monthlyRent.toLocaleString()} FCFA
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-500/10 rounded-lg">
                    <DollarSign className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Caution</p>
                    <p className="font-semibold">
                      {property.securityDeposit.toLocaleString()} FCFA
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>
                Disponible à partir du{" "}
                {new Date(property.availableFrom).toLocaleDateString("fr-FR")}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Propriétaire */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <User className="h-4 w-4" />
                Propriétaire
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="font-semibold">{property.owner.name}</p>
              <p className="text-sm text-muted-foreground">{property.owner.email}</p>
              {property.owner.phone && (
                <p className="text-sm text-muted-foreground">
                  {property.owner.phone}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Locataire actuel */}
          {activeLease && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <User className="h-4 w-4" />
                  Locataire actuel
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="font-semibold">{activeLease.tenant.name}</p>
                <p className="text-sm text-muted-foreground">
                  {activeLease.tenant.email}
                </p>
                {activeLease.tenant.phone && (
                  <p className="text-sm text-muted-foreground">
                    {activeLease.tenant.phone}
                  </p>
                )}
                <Separator className="my-2" />
                <p className="text-sm text-muted-foreground">
                  Bail du{" "}
                  {new Date(activeLease.startDate).toLocaleDateString("fr-FR")}{" "}
                  au {new Date(activeLease.endDate).toLocaleDateString("fr-FR")}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Demandes de maintenance récentes */}
          {property.maintenanceRequests.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <AlertCircle className="h-4 w-4" />
                  Maintenance récente
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {property.maintenanceRequests.map((request) => (
                  <div
                    key={request.id}
                    className="text-sm p-2 bg-muted/50 rounded-lg"
                  >
                    <p className="font-medium">{request.title}</p>
                    <p className="text-muted-foreground text-xs">
                      {new Date(request.createdAt).toLocaleDateString("fr-FR")}
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Dialog de confirmation de suppression */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
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
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
