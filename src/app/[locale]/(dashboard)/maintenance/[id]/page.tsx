"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
import {
  MaintenancePriorityBadge,
  MaintenanceStatusBadge,
} from "@/components/maintenance/maintenance-badges";
import { CommentThread } from "@/components/maintenance/comment-thread";
import { ManageRequestCard } from "@/components/maintenance/manage-request-card";
import type { MaintenanceDetail, UserSummary } from "@/components/maintenance/types";
import { canDeleteRequest, canManageProperty } from "@/lib/maintenance";
import { cn, formatCurrency } from "@/lib/utils";
import {
  Building2,
  CalendarClock,
  CheckCircle2,
  FileText,
  Info,
  Loader2,
  Trash2,
  User,
  UserCog,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";

function formatDate(value: string | null) {
  return value ? new Date(value).toLocaleDateString("fr-FR") : "—";
}

function InfoRow({
  label,
  value,
  hint,
  icon: Icon,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
      {Icon && (
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted">
          <Icon className="h-4 w-4 text-muted-foreground" aria-hidden />
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <div className="mt-0.5 text-sm font-medium break-words">{value}</div>
        {hint && <div className="text-xs text-muted-foreground break-words">{hint}</div>}
      </div>
    </div>
  );
}

function PersonValue({ person }: { person: UserSummary | null }) {
  if (!person) return <span className="text-muted-foreground">Non assigné</span>;
  return (
    <>
      <span>{person.name}</span>
      <span className="block text-xs font-normal text-muted-foreground">
        {person.email}
        {person.phone ? ` · ${person.phone}` : ""}
      </span>
    </>
  );
}

function DetailSkeleton() {
  return (
    <div className="animate-fade-in space-y-6" aria-busy="true" aria-live="polite">
      <div className="space-y-2">
        <Skeleton className="h-8 w-72 max-w-full" />
        <Skeleton className="h-5 w-48" />
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Skeleton className="h-48 rounded-xl" />
          <Skeleton className="h-72 rounded-xl" />
        </div>
        <div className="space-y-6">
          <Skeleton className="h-96 rounded-xl" />
        </div>
      </div>
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
    return <DetailSkeleton />;
  }

  if (!request) {
    return null;
  }

  const user = session?.user;
  const canManage = user ? canManageProperty(user, request.property) : false;
  const canDelete = user ? canDeleteRequest(user, request) : false;

  return (
    <div className="space-y-6">
      <PageHeader
        title={request.title}
        backHref="/maintenance"
        actions={
          canDelete ? (
            <Button variant="destructive" onClick={() => setDeleteDialogOpen(true)}>
              <Trash2 className="h-4 w-4" aria-hidden />
              Supprimer
            </Button>
          ) : undefined
        }
      >
        <MaintenanceStatusBadge status={request.status} />
        <MaintenancePriorityBadge priority={request.priority} />
        {request.category && <Badge variant="outline">{request.category}</Badge>}
        <span className="text-sm text-muted-foreground">
          Créée le {formatDate(request.createdAt)}
        </span>
      </PageHeader>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card className="animate-fade-up" style={{ "--stagger": 1 } as React.CSSProperties}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" aria-hidden />
                Description
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-sm leading-relaxed">
                {request.description}
              </p>
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

          <Card
            className="animate-fade-up"
            style={{ "--stagger": canManage ? 4 : 3 } as React.CSSProperties}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="h-4 w-4 text-muted-foreground" aria-hidden />
                Informations
              </CardTitle>
            </CardHeader>
            <CardContent className="divide-y">
              <InfoRow
                icon={Building2}
                label="Bien"
                value={request.property.name}
                hint={`${request.property.address}, ${request.property.city}`}
              />
              <InfoRow
                icon={User}
                label="Demandeur"
                value={<PersonValue person={request.tenant} />}
              />
              <InfoRow
                icon={UserCog}
                label="Intervenant"
                value={<PersonValue person={request.assignedTo} />}
              />
              <InfoRow
                icon={CalendarClock}
                label="Intervention prévue le"
                value={
                  <span className={cn("tabular-nums", !request.scheduledDate && "text-muted-foreground")}>
                    {request.scheduledDate ? formatDate(request.scheduledDate) : "Non planifiée"}
                  </span>
                }
                hint={`Dernière mise à jour le ${formatDate(request.updatedAt)}`}
              />
              <InfoRow
                icon={Wallet}
                label="Coût"
                value={
                  request.cost != null ? (
                    <span className="tabular-nums">{formatCurrency(request.cost)}</span>
                  ) : (
                    <span className="text-muted-foreground">Non renseigné</span>
                  )
                }
              />
              {request.resolvedAt && (
                <InfoRow
                  icon={CheckCircle2}
                  label="Résolue le"
                  value={<span className="tabular-nums">{formatDate(request.resolvedAt)}</span>}
                />
              )}
              <InfoRow
                label="Propriétaire"
                value={<PersonValue person={request.property.owner} />}
              />
              {request.property.manager && (
                <InfoRow
                  label="Gestionnaire"
                  value={<PersonValue person={request.property.manager} />}
                />
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
              className={buttonVariants({ variant: "destructive" })}
            >
              {isDeleting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
