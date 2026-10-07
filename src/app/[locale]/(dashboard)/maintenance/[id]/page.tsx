"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
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
  MaintenancePriorityBadge,
  MaintenanceStatusBadge,
} from "@/components/maintenance/maintenance-badges";
import { CommentThread } from "@/components/maintenance/comment-thread";
import { ManageRequestCard } from "@/components/maintenance/manage-request-card";
import type { MaintenanceDetail, UserSummary } from "@/components/maintenance/types";
import { canDeleteRequest, canManageProperty } from "@/lib/maintenance";
import { formatCurrency } from "@/lib/utils";
import { ArrowLeft, Building2, Loader2, Trash2, Users, Wrench } from "lucide-react";
import { toast } from "sonner";

function formatDate(value: string | null) {
  return value ? new Date(value).toLocaleDateString("fr-FR") : "—";
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  );
}

function PersonRow({ label, person }: { label: string; person: UserSummary | null }) {
  return (
    <div>
      <p className="text-sm text-muted-foreground">{label}</p>
      {person ? (
        <>
          <p className="font-medium">{person.name}</p>
          <p className="text-sm text-muted-foreground">{person.email}</p>
          {person.phone && (
            <p className="text-sm text-muted-foreground">{person.phone}</p>
          )}
        </>
      ) : (
        <p className="font-medium">—</p>
      )}
    </div>
  );
}

export default function MaintenanceDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { data: session } = useSession();
  const [request, setRequest] = useState<MaintenanceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const fetchRequest = async () => {
      try {
        const response = await fetch(`/api/maintenance/${params.id}`);
        if (!response.ok) {
          throw new Error("Demande non trouvée");
        }
        setRequest(await response.json());
      } catch (error) {
        console.error("Erreur:", error);
        toast.error("Erreur lors du chargement de la demande");
        router.push("/maintenance");
      } finally {
        setLoading(false);
      }
    };
    fetchRequest();
  }, [params.id, reloadKey, router]);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/maintenance/${params.id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erreur lors de la suppression");
      }
      toast.success("Demande supprimée");
      router.push("/maintenance");
    } catch (error) {
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

  if (!request) {
    return null;
  }

  const user = session?.user;
  const canManage = user ? canManageProperty(user, request.property) : false;
  const canDelete = user ? canDeleteRequest(user, request) : false;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push("/maintenance")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{request.title}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <MaintenanceStatusBadge status={request.status} />
              <MaintenancePriorityBadge priority={request.priority} />
              <span className="text-sm text-muted-foreground">
                Créée le {formatDate(request.createdAt)}
              </span>
            </div>
          </div>
        </div>
        {canDelete && (
          <Button variant="destructive" onClick={() => setDeleteDialogOpen(true)}>
            <Trash2 className="mr-2 h-4 w-4" />
            Supprimer
          </Button>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="space-y-6 md:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wrench className="h-5 w-5" />
                Détails de la demande
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <p className="whitespace-pre-wrap">{request.description}</p>

              <Separator />

              <div className="grid gap-4 sm:grid-cols-2">
                <InfoRow
                  label="Propriété"
                  value={
                    <span className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      {request.property.name}
                    </span>
                  }
                />
                <InfoRow
                  label="Adresse"
                  value={`${request.property.address}, ${request.property.city}`}
                />
                <InfoRow label="Catégorie" value={request.category || "Non précisée"} />
                <InfoRow
                  label="Intervention prévue le"
                  value={formatDate(request.scheduledDate)}
                />
                <InfoRow
                  label="Coût"
                  value={request.cost != null ? formatCurrency(request.cost) : "—"}
                />
                <InfoRow label="Dernière mise à jour" value={formatDate(request.updatedAt)} />
                {request.resolvedAt && (
                  <InfoRow label="Résolue le" value={formatDate(request.resolvedAt)} />
                )}
              </div>
            </CardContent>
          </Card>

          <CommentThread
            key={request.id}
            requestId={request.id}
            initialComments={request.comments}
            currentUserId={user?.id}
          />
        </div>

        <div className="space-y-6">
          {canManage && (
            <ManageRequestCard
              key={request.updatedAt}
              request={request}
              onUpdated={() => setReloadKey((k) => k + 1)}
            />
          )}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Intervenants
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <PersonRow label="Demandeur" person={request.tenant} />
              <Separator />
              <PersonRow label="Intervenant assigné" person={request.assignedTo} />
              <Separator />
              <PersonRow label="Propriétaire" person={request.property.owner} />
              {request.property.manager && (
                <>
                  <Separator />
                  <PersonRow label="Gestionnaire" person={request.property.manager} />
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer la demande ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. La demande et tous ses commentaires
              seront définitivement supprimés.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
              disabled={isDeleting}
              className="bg-destructive text-white hover:bg-destructive/90"
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
