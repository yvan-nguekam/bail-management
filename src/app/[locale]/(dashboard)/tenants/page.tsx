"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  Users,
  Search,
  ChevronRight,
  UserCheck,
  AlertCircle,
  Mail,
  Phone,
  Plus,
} from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { TableSkeleton } from "@/components/shared/page-skeleton";
import { StatCard } from "@/components/dashboard/stat-card";
import { TenantAvatar } from "@/components/tenants/tenant-avatar";

interface TenantRow {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  activeLease: {
    id: string;
    propertyName: string;
    monthlyRent: number;
    endDate: string;
  } | null;
  leaseCount: number;
  overdueAmount: number;
  overdueCount: number;
}

interface Stats {
  total: number;
  withActiveLease: number;
  totalOverdue: number;
}

const formatDate = (date: string) =>
  new Date(date).toLocaleDateString("fr-FR", { timeZone: "UTC" });

export default function TenantsPage() {
  const router = useRouter();
  const [tenants, setTenants] = useState<TenantRow[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, withActiveLease: 0, totalOverdue: 0 });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm.trim()), 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    let cancelled = false;

    const fetchTenants = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ status: statusFilter });
        if (debouncedSearch) params.append("search", debouncedSearch);

        const response = await fetch(`/api/tenants?${params}`);
        if (!response.ok) throw new Error("Erreur lors du chargement des locataires");

        const data = await response.json();
        if (!cancelled) {
          setTenants(data.tenants);
          setStats(data.stats);
        }
      } catch (error) {
        console.error("Erreur:", error);
        if (!cancelled) toast.error("Erreur lors du chargement des locataires");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchTenants();
    return () => {
      cancelled = true;
    };
  }, [debouncedSearch, statusFilter]);

  const isFiltered = debouncedSearch !== "" || statusFilter !== "all";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Locataires"
        description="Suivez vos locataires, leurs baux et leurs impayés"
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard index={0} title="Locataires" value={stats.total} icon={Users} />
        <StatCard
          index={1}
          title="Avec bail actif"
          value={stats.withActiveLease}
          icon={UserCheck}
          tone="success"
        />
        <StatCard
          index={2}
          title="Total des impayés"
          value={formatCurrency(stats.totalOverdue)}
          description={stats.totalOverdue > 0 ? "À recouvrer" : "Aucun impayé"}
          icon={AlertCircle}
          tone={stats.totalOverdue > 0 ? "danger" : "default"}
          className="sm:col-span-2 lg:col-span-1"
        />
      </div>

      <Card className="animate-fade-up" style={{ "--stagger": 3 } as React.CSSProperties}>
        <CardHeader className="gap-4 sm:flex sm:flex-row sm:items-center sm:justify-between">
          <CardTitle>
            Liste des locataires{" "}
            <span className="font-normal text-muted-foreground tabular-nums">({stats.total})</span>
          </CardTitle>
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <Input
                type="search"
                placeholder="Nom ou e-mail…"
                aria-label="Rechercher un locataire"
                className="w-full pl-9 sm:w-[240px]"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px]" aria-label="Filtrer les locataires">
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les locataires</SelectItem>
                <SelectItem value="active">Avec bail actif</SelectItem>
                <SelectItem value="former">Anciens locataires</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <TableSkeleton rows={6} />
          ) : tenants.length === 0 ? (
            <EmptyState
              icon={Users}
              title="Aucun locataire trouvé"
              description={
                isFiltered
                  ? "Aucun locataire ne correspond à ces critères."
                  : "Les locataires apparaissent ici dès qu'un bail est créé sur l'un de vos biens."
              }
              action={
                !isFiltered ? (
                  <Button onClick={() => router.push("/leases/new")}>
                    <Plus className="h-4 w-4" aria-hidden />
                    Nouveau bail
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <div className="overflow-hidden rounded-lg border">
              <Table className="[&_td]:px-3 [&_td]:py-3 [&_th]:px-3">
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead>Locataire</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Bien actuel</TableHead>
                    <TableHead className="text-right">Loyer</TableHead>
                    <TableHead className="text-right">Impayés</TableHead>
                    <TableHead className="w-12">
                      <span className="sr-only">Ouvrir</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tenants.map((tenant) => (
                    <TableRow
                      key={tenant.id}
                      className="cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => router.push(`/tenants/${tenant.id}`)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <TenantAvatar name={tenant.name} />
                          <div className="min-w-0">
                            <div className="font-medium">{tenant.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {tenant.leaseCount} {tenant.leaseCount > 1 ? "baux" : "bail"}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <Mail className="h-3.5 w-3.5 shrink-0" aria-hidden />
                          {tenant.email}
                        </div>
                        {tenant.phone && (
                          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                            <Phone className="h-3.5 w-3.5 shrink-0" aria-hidden />
                            {tenant.phone}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {tenant.activeLease ? (
                          <div>
                            <div className="font-medium">{tenant.activeLease.propertyName}</div>
                            <div className="text-xs text-muted-foreground">
                              Jusqu&apos;au {formatDate(tenant.activeLease.endDate)}
                            </div>
                          </div>
                        ) : (
                          <Badge variant="muted">Ancien locataire</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {tenant.activeLease ? (
                          <span className="font-medium">
                            {formatCurrency(tenant.activeLease.monthlyRent)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {tenant.overdueAmount > 0 ? (
                          <div className="font-medium text-destructive">
                            {formatCurrency(tenant.overdueAmount)}
                            <div className="text-xs font-normal">
                              {tenant.overdueCount} échéance
                              {tenant.overdueCount > 1 ? "s" : ""} en retard
                            </div>
                          </div>
                        ) : (
                          <Badge variant="success">À jour</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/tenants/${tenant.id}`);
                          }}
                          aria-label={`Voir ${tenant.name}`}
                        >
                          <ChevronRight className="h-4 w-4" aria-hidden />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
