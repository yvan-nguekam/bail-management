"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { Users, Search, Eye, Loader2, UserCheck, AlertCircle, Mail, Phone } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";

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
      <div>
        <h1 className="text-3xl font-bold">Locataires</h1>
        <p className="text-muted-foreground">
          Suivez vos locataires, leurs baux et leurs impayés
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Locataires</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avec bail actif</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.withActiveLease}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total des impayés</CardTitle>
            <AlertCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${stats.totalOverdue > 0 ? "text-destructive" : ""}`}
            >
              {formatCurrency(stats.totalOverdue)}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Liste des locataires ({stats.total})
            </CardTitle>
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Nom ou email..."
                  className="pl-8 w-full sm:w-[250px]"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les locataires</SelectItem>
                  <SelectItem value="active">Avec bail actif</SelectItem>
                  <SelectItem value="former">Anciens locataires</SelectItem>
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
          ) : tenants.length === 0 ? (
            <div className="text-center py-12">
              <Users className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">Aucun locataire trouvé</h3>
              <p className="text-muted-foreground">
                {isFiltered
                  ? "Aucun locataire ne correspond à ces critères"
                  : "Les locataires apparaissent ici dès qu'un bail est créé sur l'un de vos biens"}
              </p>
              {!isFiltered && (
                <Button onClick={() => router.push("/leases/new")} className="mt-4">
                  Nouveau bail
                </Button>
              )}
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Locataire</TableHead>
                    <TableHead>Bien actuel</TableHead>
                    <TableHead>Loyer</TableHead>
                    <TableHead>Impayés</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tenants.map((tenant) => (
                    <TableRow key={tenant.id}>
                      <TableCell>
                        <div className="font-medium">{tenant.name}</div>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Mail className="h-3 w-3" />
                          {tenant.email}
                        </div>
                        {tenant.phone && (
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Phone className="h-3 w-3" />
                            {tenant.phone}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {tenant.activeLease ? (
                          <div>
                            <div className="font-medium">{tenant.activeLease.propertyName}</div>
                            <div className="text-sm text-muted-foreground">
                              Jusqu&apos;au {formatDate(tenant.activeLease.endDate)}
                            </div>
                          </div>
                        ) : (
                          <Badge variant="secondary">
                            Ancien locataire ({tenant.leaseCount}{" "}
                            {tenant.leaseCount > 1 ? "baux" : "bail"})
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {tenant.activeLease ? (
                          <span className="font-semibold">
                            {formatCurrency(tenant.activeLease.monthlyRent)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {tenant.overdueAmount > 0 ? (
                          <div className="font-semibold text-destructive">
                            {formatCurrency(tenant.overdueAmount)}
                            <div className="text-xs font-normal">
                              {tenant.overdueCount} échéance
                              {tenant.overdueCount > 1 ? "s" : ""} en retard
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">À jour</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => router.push(`/tenants/${tenant.id}`)}
                          aria-label={`Voir ${tenant.name}`}
                        >
                          <Eye className="h-4 w-4" />
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
