"use client";

import { useEffect, useState } from "react";
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
  Building2,
  CheckCircle2,
  Clock,
  Eye,
  Loader2,
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Maintenance</h1>
          <p className="text-muted-foreground">
            Suivez les demandes d&apos;intervention sur vos biens
          </p>
        </div>
        <Button onClick={() => router.push("/maintenance/new")}>
          <Plus className="mr-2 h-4 w-4" />
          Nouvelle demande
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          title="Ouvertes"
          value={stats.OPEN}
          description="En attente de prise en charge"
          icon={AlertCircle}
        />
        <StatCard
          title="En cours"
          value={stats.IN_PROGRESS}
          description="Interventions en cours"
          icon={Clock}
        />
        <StatCard
          title="Résolues"
          value={stats.RESOLVED + stats.CLOSED}
          description={`Dont ${stats.CLOSED} clôturée${stats.CLOSED > 1 ? "s" : ""}`}
          icon={CheckCircle2}
        />
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="flex items-center gap-2">
              <Wrench className="h-5 w-5" />
              Demandes ({pagination.total})
            </CardTitle>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Select value={statusFilter} onValueChange={changeFilter(setStatusFilter)}>
                <SelectTrigger className="w-full sm:w-[170px]">
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
              <Select
                value={priorityFilter}
                onValueChange={changeFilter(setPriorityFilter)}
              >
                <SelectTrigger className="w-full sm:w-[170px]">
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
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : requests.length === 0 ? (
            <div className="text-center py-12">
              <Wrench className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">Aucune demande trouvée</h3>
              <p className="text-muted-foreground">
                {statusFilter !== "all" || priorityFilter !== "all"
                  ? "Aucune demande ne correspond à ces filtres"
                  : "Aucune demande de maintenance pour le moment"}
              </p>
            </div>
          ) : (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Demande</TableHead>
                      <TableHead>Propriété</TableHead>
                      <TableHead>Demandeur</TableHead>
                      <TableHead>Priorité</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead>Créée le</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {requests.map((request) => (
                      <TableRow
                        key={request.id}
                        className="cursor-pointer"
                        onClick={() => router.push(`/maintenance/${request.id}`)}
                      >
                        <TableCell>
                          <div className="font-medium">{request.title}</div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            {request.category && <span>{request.category}</span>}
                            {request.comments.length > 0 && (
                              <span className="flex items-center gap-1">
                                <MessageSquare className="h-3 w-3" />
                                {request.comments.length}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium flex items-center gap-2">
                            <Building2 className="h-3 w-3 text-muted-foreground" />
                            {request.property.name}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {request.property.city}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{request.tenant.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {request.tenant.email}
                          </div>
                        </TableCell>
                        <TableCell>
                          <MaintenancePriorityBadge priority={request.priority} />
                        </TableCell>
                        <TableCell>
                          <MaintenanceStatusBadge status={request.status} />
                        </TableCell>
                        <TableCell className="text-sm">
                          {new Date(request.createdAt).toLocaleDateString("fr-FR")}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            aria-label="Voir la demande"
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/maintenance/${request.id}`);
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {pagination.totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-muted-foreground">
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
