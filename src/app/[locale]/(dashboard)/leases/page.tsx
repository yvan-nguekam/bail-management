"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
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
import { StatusBadge, statusLabel } from "@/components/shared/status-badge";
import { StatCard } from "@/components/dashboard/stat-card";
import { ListPagination } from "@/components/properties/list-pagination";
import { formatDay } from "@/components/properties/property-labels";
import { formatCurrency, cn } from "@/lib/utils";
import {
  FileText,
  Plus,
  Search,
  SearchX,
  ChevronRight,
  FileCheck2,
  FilePen,
  CalendarX2,
} from "lucide-react";

interface Lease {
  id: string;
  startDate: string;
  endDate: string;
  monthlyRent: number;
  status: string;
  property: {
    id: string;
    name: string;
    address: string;
    city: string;
  };
  tenant: {
    id: string;
    name: string;
    email: string;
  };
  payments: Array<{
    id: string;
    amount: number;
    dueDate: string;
  }>;
}

interface PaginationData {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface LeaseStats {
  total: number;
  active: number;
  draft: number;
  expired: number;
}

const leaseStatuses = ["DRAFT", "ACTIVE", "EXPIRED", "TERMINATED", "RENEWED"] as const;

// Compte les baux d'un statut via la pagination de l'API (requête minimale)
async function countLeases(status?: string) {
  const params = new URLSearchParams({ page: "1", limit: "1" });
  if (status) params.append("status", status);
  const response = await fetch(`/api/leases?${params}`);
  if (!response.ok) return 0;
  const data = await response.json();
  return (data.pagination?.total as number) ?? 0;
}

export default function LeasesPage() {
  const router = useRouter();
  const [leases, setLeases] = useState<Lease[]>([]);
  const [pagination, setPagination] = useState<PaginationData>({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<LeaseStats | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const fetchLeases = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      });

      if (statusFilter !== "all") {
        params.append("status", statusFilter);
      }

      const response = await fetch(`/api/leases?${params}`);

      if (!response.ok) {
        throw new Error("Erreur lors du chargement des baux");
      }

      const data = await response.json();
      setLeases(data.leases);
      setPagination(data.pagination);
    } catch (error) {
      console.error("Erreur:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const [total, active, draft, expired] = await Promise.all([
        countLeases(),
        countLeases("ACTIVE"),
        countLeases("DRAFT"),
        countLeases("EXPIRED"),
      ]);
      setStats({ total, active, draft, expired });
    } catch (error) {
      console.error("Erreur:", error);
    }
  };

  useEffect(() => {
    fetchLeases();
  }, [pagination.page, statusFilter]);

  useEffect(() => {
    fetchStats();
  }, []);

  const filteredLeases = leases.filter(
    (lease) =>
      lease.property.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lease.tenant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lease.property.city.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getDaysUntilExpiry = (endDate: string) => {
    const days = Math.ceil(
      (new Date(endDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
    );
    return days;
  };

  const hasFilters = searchTerm !== "" || statusFilter !== "all";

  const resetFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
  };

  const createAction = (
    <Button asChild>
      <Link href="/leases/new">
        <Plus aria-hidden />
        Nouveau bail
      </Link>
    </Button>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Baux"
        description="Suivez vos contrats de location et leurs échéances."
        actions={createAction}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total des baux" value={stats?.total ?? "—"} icon={FileText} index={0} />
        <StatCard
          title="Actifs"
          value={stats?.active ?? "—"}
          icon={FileCheck2}
          tone="success"
          index={1}
        />
        <StatCard
          title="Brouillons"
          value={stats?.draft ?? "—"}
          icon={FilePen}
          index={2}
        />
        <StatCard
          title="Expirés"
          value={stats?.expired ?? "—"}
          icon={CalendarX2}
          tone="warning"
          index={3}
        />
      </div>

      {/* Barre d'outils : recherche + filtre */}
      <div
        className="animate-fade-up flex flex-col gap-2 sm:flex-row sm:items-center"
        style={{ "--stagger": 4 } as React.CSSProperties}
      >
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            type="search"
            placeholder="Rechercher un bien, un locataire, une ville…"
            aria-label="Rechercher un bail"
            className="h-10 bg-card pl-9 sm:h-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger
            className="h-10 w-full bg-card sm:h-9 sm:w-[170px]"
            aria-label="Filtrer par statut"
          >
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            {leaseStatuses.map((value) => (
              <SelectItem key={value} value={value}>
                {statusLabel("lease", value)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card className="animate-fade-up" style={{ "--stagger": 5 } as React.CSSProperties}>
        <CardContent className="space-y-4">
          {loading ? (
            <TableSkeleton rows={6} />
          ) : filteredLeases.length === 0 ? (
            hasFilters ? (
              <EmptyState
                icon={SearchX}
                title="Aucun bail ne correspond"
                description="Essayez un autre terme de recherche ou réinitialisez les filtres."
                action={
                  <Button variant="outline" onClick={resetFilters}>
                    Réinitialiser les filtres
                  </Button>
                }
                className="border-0 py-10"
              />
            ) : (
              <EmptyState
                icon={FileText}
                title="Aucun bail pour le moment"
                description="Créez votre premier contrat de location pour suivre loyers et échéances."
                action={createAction}
                className="border-0 py-10"
              />
            )
          ) : (
            <>
              <div className="overflow-hidden rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40 hover:bg-muted/40">
                      <TableHead className="pl-4">Bien</TableHead>
                      <TableHead>Locataire</TableHead>
                      <TableHead>Période</TableHead>
                      <TableHead className="text-right">Loyer</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead>Échéance</TableHead>
                      <TableHead className="w-12 pr-4">
                        <span className="sr-only">Ouvrir</span>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLeases.map((lease) => {
                      const daysUntilExpiry = getDaysUntilExpiry(lease.endDate);
                      const isExpiringSoon =
                        lease.status === "ACTIVE" &&
                        daysUntilExpiry > 0 &&
                        daysUntilExpiry <= 30;

                      return (
                        <TableRow
                          key={lease.id}
                          className="cursor-pointer"
                          onClick={() => router.push(`/leases/${lease.id}`)}
                        >
                          <TableCell className="py-3 pl-4">
                            <div className="font-medium">{lease.property.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {lease.property.city}
                            </div>
                          </TableCell>
                          <TableCell className="py-3">
                            <div className="font-medium">{lease.tenant.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {lease.tenant.email}
                            </div>
                          </TableCell>
                          <TableCell className="py-3 tabular-nums">
                            <div>{formatDay(lease.startDate)}</div>
                            <div className="text-xs text-muted-foreground">
                              au {formatDay(lease.endDate)}
                            </div>
                          </TableCell>
                          <TableCell className="py-3 text-right font-semibold tabular-nums">
                            {formatCurrency(lease.monthlyRent)}
                          </TableCell>
                          <TableCell className="py-3">
                            <StatusBadge kind="lease" status={lease.status} />
                          </TableCell>
                          <TableCell className="py-3 text-sm tabular-nums">
                            {lease.status === "ACTIVE" ? (
                              daysUntilExpiry > 0 ? (
                                <span
                                  className={cn(
                                    isExpiringSoon
                                      ? "font-medium text-warning"
                                      : "text-muted-foreground"
                                  )}
                                >
                                  {daysUntilExpiry} jour{daysUntilExpiry > 1 ? "s" : ""}
                                </span>
                              ) : (
                                <span className="font-medium text-destructive">Dépassée</span>
                              )
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="py-3 pr-4 text-right">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-muted-foreground"
                              asChild
                            >
                              <Link
                                href={`/leases/${lease.id}`}
                                aria-label={`Ouvrir le bail de ${lease.tenant.name}`}
                                onClick={(e) => e.stopPropagation()}
                              >
                                <ChevronRight />
                              </Link>
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              <ListPagination
                page={pagination.page}
                totalPages={pagination.totalPages}
                total={pagination.total}
                itemLabels={["bail", "baux"]}
                onPageChange={(page) => setPagination((prev) => ({ ...prev, page }))}
              />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
