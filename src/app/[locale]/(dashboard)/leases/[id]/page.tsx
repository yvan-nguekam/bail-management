"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft,
  Edit,
  Trash2,
  FileText,
  Calendar,
  DollarSign,
  User,
  Building2,
  Loader2,
  RefreshCw,
  XCircle,
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Lease {
  id: string;
  startDate: string;
  endDate: string;
  monthlyRent: number;
  securityDeposit: number;
  status: string;
  terms: string;
  property: {
    id: string;
    name: string;
    address: string;
    city: string;
    type: string;
    owner: {
      name: string;
      email: string;
      phone: string;
    };
  };
  tenant: {
    id: string;
    name: string;
    email: string;
    phone: string;
  };
  payments: Array<{
    id: string;
    amount: number;
    dueDate: string;
    status: string;
  }>;
}

const statusLabels: Record<string, string> = {
  DRAFT: "Brouillon",
  ACTIVE: "Actif",
  EXPIRED: "Expiré",
  TERMINATED: "Résilié",
  RENEWED: "Renouvelé",
};

const statusColors: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  DRAFT: "outline",
  ACTIVE: "default",
  EXPIRED: "destructive",
  TERMINATED: "secondary",
  RENEWED: "secondary",
};

export default function LeaseDetailsPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [lease, setLease] = useState<Lease | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [renewDialogOpen, setRenewDialogOpen] = useState(false);
  const [terminateDialogOpen, setTerminateDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRenewing, setIsRenewing] = useState(false);
  const [isTerminating, setIsTerminating] = useState(false);

  const [renewEndDate, setRenewEndDate] = useState("");
  const [renewRent, setRenewRent] = useState("");
  const [terminationDate, setTerminationDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [terminationReason, setTerminationReason] = useState("");

  useEffect(() => {
    fetchLease();
  }, [params.id]);

  const fetchLease = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/leases/${params.id}`);

      if (!response.ok) {
        throw new Error("Bail non trouvé");
      }

      const data = await response.json();
      setLease(data);
      setRenewRent(data.monthlyRent.toString());
    } catch (error) {
      console.error("Erreur:", error);
      toast.error("Erreur lors du chargement du bail");
      router.push("/leases");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/leases/${params.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erreur lors de la suppression");
      }

      toast.success("Bail supprimé avec succès");
      router.push("/leases");
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

  const handleRenew = async () => {
    if (!renewEndDate || !renewRent) {
      toast.error("Veuillez remplir tous les champs");
      return;
    }

    setIsRenewing(true);
    try {
      const response = await fetch(`/api/leases/${params.id}/renew`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          newEndDate: new Date(renewEndDate).toISOString(),
          newMonthlyRent: parseFloat(renewRent),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erreur lors du renouvellement");
      }

      const newLease = await response.json();
      toast.success("Bail renouvelé avec succès");
      router.push(`/leases/${newLease.id}`);
    } catch (error) {
      console.error("Erreur:", error);
      toast.error(
        error instanceof Error ? error.message : "Erreur lors du renouvellement"
      );
    } finally {
      setIsRenewing(false);
      setRenewDialogOpen(false);
    }
  };

  const handleTerminate = async () => {
    if (!terminationDate) {
      toast.error("Veuillez saisir une date de résiliation");
      return;
    }

    setIsTerminating(true);
    try {
      const response = await fetch(`/api/leases/${params.id}/terminate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          terminationDate: new Date(terminationDate).toISOString(),
          reason: terminationReason,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erreur lors de la résiliation");
      }

      toast.success("Bail résilié avec succès");
      fetchLease();
    } catch (error) {
      console.error("Erreur:", error);
      toast.error(
        error instanceof Error ? error.message : "Erreur lors de la résiliation"
      );
    } finally {
      setIsTerminating(false);
      setTerminateDialogOpen(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!lease) {
    return null;
  }

  const daysUntilExpiry = Math.ceil(
    (new Date(lease.endDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
  );
  const isExpiringSoon = lease.status === "ACTIVE" && daysUntilExpiry > 0 && daysUntilExpiry <= 30;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Détails du bail</h1>
            <p className="text-muted-foreground">{lease.property.name}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {lease.status === "ACTIVE" && (
            <>
              <Button
                variant="outline"
                onClick={() => setRenewDialogOpen(true)}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Renouveler
              </Button>
              <Button
                variant="outline"
                onClick={() => setTerminateDialogOpen(true)}
              >
                <XCircle className="mr-2 h-4 w-4" />
                Résilier
              </Button>
            </>
          )}
          <Button
            variant="outline"
            onClick={() => router.push(`/leases/${lease.id}/edit`)}
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

      {isExpiringSoon && (
        <Card className="border-orange-500 bg-orange-50 dark:bg-orange-950/20">
          <CardContent className="flex items-center gap-3 pt-6">
            <AlertCircle className="h-5 w-5 text-orange-600" />
            <p className="text-sm font-medium text-orange-900 dark:text-orange-100">
              Ce bail expire dans {daysUntilExpiry} jour{daysUntilExpiry > 1 ? "s" : ""}.
              Pensez à le renouveler.
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-3">
        {/* Informations principales */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Informations du bail
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center gap-2">
              <Badge variant={statusColors[lease.status]}>
                {statusLabels[lease.status]}
              </Badge>
            </div>

            <Separator />

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Calendar className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Date de début</p>
                  <p className="font-semibold">
                    {new Date(lease.startDate).toLocaleDateString("fr-FR")}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Calendar className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Date de fin</p>
                  <p className="font-semibold">
                    {new Date(lease.endDate).toLocaleDateString("fr-FR")}
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500/10 rounded-lg">
                  <DollarSign className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Loyer mensuel</p>
                  <p className="font-semibold">
                    {lease.monthlyRent.toLocaleString()} FCFA
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
                    {lease.securityDeposit.toLocaleString()} FCFA
                  </p>
                </div>
              </div>
            </div>

            {lease.terms && (
              <>
                <Separator />
                <div>
                  <h4 className="font-semibold mb-2">Conditions du bail</h4>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {lease.terms}
                  </p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Propriété */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Building2 className="h-4 w-4" />
                Propriété
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="font-semibold">{lease.property.name}</p>
              <p className="text-sm text-muted-foreground">
                {lease.property.address}
              </p>
              <p className="text-sm text-muted-foreground">{lease.property.city}</p>
              <Separator className="my-2" />
              <p className="text-sm font-medium">Propriétaire</p>
              <p className="text-sm">{lease.property.owner.name}</p>
              <p className="text-sm text-muted-foreground">
                {lease.property.owner.email}
              </p>
            </CardContent>
          </Card>

          {/* Locataire */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <User className="h-4 w-4" />
                Locataire
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="font-semibold">{lease.tenant.name}</p>
              <p className="text-sm text-muted-foreground">{lease.tenant.email}</p>
              {lease.tenant.phone && (
                <p className="text-sm text-muted-foreground">{lease.tenant.phone}</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Dialog de suppression */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer ce bail ? Cette action est
              irréversible.
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

      {/* Dialog de renouvellement */}
      <Dialog open={renewDialogOpen} onOpenChange={setRenewDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Renouveler le bail</DialogTitle>
            <DialogDescription>
              Créez un nouveau bail pour prolonger la location
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="renewEndDate">Nouvelle date de fin</Label>
              <Input
                id="renewEndDate"
                type="date"
                value={renewEndDate}
                onChange={(e) => setRenewEndDate(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="renewRent">Nouveau loyer mensuel (FCFA)</Label>
              <Input
                id="renewRent"
                type="number"
                value={renewRent}
                onChange={(e) => setRenewRent(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRenewDialogOpen(false)}
              disabled={isRenewing}
            >
              Annuler
            </Button>
            <Button onClick={handleRenew} disabled={isRenewing}>
              {isRenewing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Renouveler
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de résiliation */}
      <Dialog open={terminateDialogOpen} onOpenChange={setTerminateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Résilier le bail</DialogTitle>
            <DialogDescription>
              Mettez fin au contrat de location
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="terminationDate">Date de résiliation</Label>
              <Input
                id="terminationDate"
                type="date"
                value={terminationDate}
                onChange={(e) => setTerminationDate(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="terminationReason">Raison (optionnel)</Label>
              <Textarea
                id="terminationReason"
                value={terminationReason}
                onChange={(e) => setTerminationReason(e.target.value)}
                placeholder="Expliquez la raison de la résiliation..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setTerminateDialogOpen(false)}
              disabled={isTerminating}
            >
              Annuler
            </Button>
            <Button
              onClick={handleTerminate}
              disabled={isTerminating}
              variant="destructive"
            >
              {isTerminating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Résilier
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
