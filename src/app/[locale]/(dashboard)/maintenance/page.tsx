"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { TableSkeleton } from "@/components/shared/page-skeleton";
import { StatCard } from "@/components/dashboard/stat-card";
import {
  MaintenancePriorityBadge,
  MaintenanceStatusBadge,
} from "@/components/maintenance/maintenance-badges";
import type {
  MaintenanceListItem,
  MaintenanceStats,
} from "@/components/maintenance/types";
import {
  MAINTENANCE_PRIORITIES,
  MAINTENANCE_STATUSES,
  maintenancePriorityLabels,
  maintenanceStatusLabels,
} from "@/lib/maintenance";
import {
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  MessageSquare,
  Plus,
  Wrench,
} from "lucide-react";
import { toast } from "sonner";

interface PaginationData {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const emptyStats: MaintenanceStats = {
  OPEN: 0,
  IN_PROGRESS: 0,
  RESOLVED: 0,
  CLOSED: 0,
  CANCELLED: 0,
};

export default function MaintenancePage() {
  const router = useRouter();
  const [requests, setRequests] = useState<MaintenanceListItem[]>([]);
  const [stats, setStats] = useState<MaintenanceStats>(emptyStats);
  const [pagination, setPagination] = useState<PaginationData>({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");

  const page = pagination.page;
  const limit = pagination.limit;

  useEffect(() => {
    const fetchRequests = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          page: page.toString(),
          limit: limit.toString(),
        });
        if (statusFilter !== "all") params.append("status", statusFilter);
        if (priorityFilter !== "all") params.append("priority", priorityFilter);

        const response = await fetch(`/api/maintenance?${params}`);
        if (!response.ok) {
          throw new Error("Erreur lors du chargement des demandes");
        }

        const data = await response.json();
        setRequests(data.requests);
        setStats({ ...emptyStats, ...data.stats });
        setPagination(data.pagination);
      } catch (error) {
        console.error("Erreur:", error);
        toast.error("Erreur lors du chargement des demandes");
      } finally {
        setLoading(false);
      }
    };

    fetchRequests();
  }, [page, limit, statusFilter, priorityFilter]);

  const changeFilter = (setter: (value: string) => void) => (value: string) => {
    setter(value);
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const hasFilters = statusFilter !== "all" || priorityFilter !== "all";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Maintenance"
        description="Suivez les demandes d'intervention sur vos biens"
        actions={
          <Button asChild>
            <Link href="/maintenance/new">
              <Plus className="h-4 w-4" aria-hidden />
              Nouvelle demande
            </Link>
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          index={0}
          title="Ouvertes"
          value={stats.OPEN}
          description="En attente de prise en charge"
          icon={AlertCircle}
          tone="info"
        />
        <StatCard
          index={1}
          title="En cours"
          value={stats.IN_PROGRESS}
          description="Interventions en cours"
          icon={Clock}
          tone="warning"
        />
        <StatCard
          index={2}
          title="Résolues"
          value={stats.RESOLVED + stats.CLOSED}
          description={`Dont ${stats.CLOSED} clôturée${stats.CLOSED > 1 ? "s" : ""}`}
          icon={CheckCircle2}
          tone="success"
        />
      </div>

      <Card className="animate-fade-up" style={{ "--stagger": 3 } as React.CSSProperties}>
        <CardHeader className="gap-4 border-b sm:flex sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              <Wrench className="h-4 w-4 text-muted-foreground" aria-hidden />
              Demandes
            </CardTitle>
            <p className="text-sm text-muted-foreground tabular-nums">
              {pagination.total} demande{pagination.total > 1 ? "s" : ""}
            </p>
          </div>
          <div className="grid gap-2 sm:flex sm:items-center">
            <Select value={statusFilter} onValueChange={changeFilter(setStatusFilter)}>
              <SelectTrigger className="w-full sm:w-[170px]" aria-label="Filtrer par statut">
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                {MAINTENANCE_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {maintenanceStatusLabels[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={changeFilter(setPriorityFilter)}>
              <SelectTrigger className="w-full sm:w-[170px]" aria-label="Filtrer par priorité">
                <SelectValue placeholder="Priorité" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes priorités</SelectItem>
                {MAINTENANCE_PRIORITIES.map((p) => (
                  <SelectItem key={p} value={p}>
                    {maintenancePriorityLabels[p]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {loading ? (
            <TableSkeleton rows={6} />
          ) : requests.length === 0 ? (
            <EmptyState
              icon={Wrench}
              title="Aucune demande trouvée"
              description={
                hasFilters
                  ? "Aucune demande ne correspond à ces filtres."
                  : "Aucune demande de maintenance pour le moment."
              }
              action={
                hasFilters ? (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setStatusFilter("all");
                      setPriorityFilter("all");
                      setPagination((prev) => ({ ...prev, page: 1 }));
                    }}
                  >
                    Réinitialiser les filtres
                  </Button>
                ) : (
                  <Button asChild>
                    <Link href="/maintenance/new">
                      <Plus className="h-4 w-4" aria-hidden />
                      Nouvelle demande
                    </Link>
                  </Button>
                )
              }
            />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Demande</TableHead>
                    <TableHead className="hidden md:table-cell">Bien</TableHead>
                    <TableHead className="hidden lg:table-cell">Demandeur</TableHead>
                    <TableHead>Priorité</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="hidden sm:table-cell text-right">Créée le</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requests.map((request) => (
                    <TableRow
                      key={request.id}
                      className="cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => router.push(`/maintenance/${request.id}`)}
                    >
                      <TableCell className="max-w-[260px] py-3">
                        <Link
                          href={`/maintenance/${request.id}`}
                          className="block truncate font-medium hover:text-primary"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {request.title}
                        </Link>
                        <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                          {request.category && (
                            <span className="truncate">{request.category}</span>
                          )}
                          {request.comments.length > 0 && (
                            <span
                              className="flex items-center gap-1 tabular-nums"
                              aria-label={`${request.comments.length} commentaire${
                                request.comments.length > 1 ? "s" : ""
                              }`}
                            >
                              <MessageSquare className="h-3 w-3" aria-hidden />
                              {request.comments.length}
                            </span>
                          )}
                          <span className="sm:hidden">
                            {new Date(request.createdAt).toLocaleDateString("fr-FR")}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell py-3">
                        <div className="font-medium">{request.property.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {request.property.city}
                        </div>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell py-3">
                        <div className="font-medium">{request.tenant.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {request.tenant.email}
                        </div>
                      </TableCell>
                      <TableCell className="py-3">
                        <MaintenancePriorityBadge priority={request.priority} />
                      </TableCell>
                      <TableCell className="py-3">
                        <MaintenanceStatusBadge status={request.status} />
                      </TableCell>
                      <TableCell className="hidden sm:table-cell py-3 text-right text-muted-foreground tabular-nums">
                        {new Date(request.createdAt).toLocaleDateString("fr-FR")}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {pagination.totalPages > 1 && (
                <div className="mt-4 flex items-center justify-between border-t pt-4">
                  <p className="text-sm text-muted-foreground tabular-nums">
                    Page {pagination.page} sur {pagination.totalPages}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setPagination((prev) => ({ ...prev, page: prev.page - 1 }))
                      }
                      disabled={pagination.page === 1}
                    >
                      <ChevronLeft className="h-4 w-4" aria-hidden />
                      Précédent
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setPagination((prev) => ({ ...prev, page: prev.page + 1 }))
                      }
                      disabled={pagination.page === pagination.totalPages}
                    >
                      Suivant
                      <ChevronRight className="h-4 w-4" aria-hidden />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
