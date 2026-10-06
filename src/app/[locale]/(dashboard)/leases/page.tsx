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
import {
  FileText,
  Plus,
  Search,
  Eye,
  Loader2,
  Calendar,
  DollarSign,
  Building2,
  User,
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

const statusLabels: Record<string, string> = {
  DRAFT: "Brouillon",
  ACTIVE: "Actif",
  EXPIRED: "Expiré",
  TERMINATED: "Résilié",
  RENEWED: "Renouvelé",
};

const statusColors: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  DRAFT: "outline",
  ACTIVE: "default",
  EXPIRED: "destructive",
  TERMINATED: "secondary",
  RENEWED: "secondary",
};

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

  useEffect(() => {
    fetchLeases();
  }, [pagination.page, statusFilter]);

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Baux</h1>
          <p className="text-muted-foreground">
            Gérez les contrats de location
          </p>
        </div>
        <Button onClick={() => router.push("/leases/new")}>
          <Plus className="mr-2 h-4 w-4" />
          Nouveau bail
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Liste des baux ({pagination.total})
            </CardTitle>
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher..."
                  className="pl-8 w-full sm:w-[250px]"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[150px]">
                  <SelectValue placeholder="Statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les statuts</SelectItem>
                  {Object.entries(statusLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
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
          ) : filteredLeases.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">
                Aucun bail trouvé
              </h3>
              <p className="text-muted-foreground">
                Commencez par créer votre premier bail
              </p>
              <Button
                onClick={() => router.push("/leases/new")}
                className="mt-4"
              >
                <Plus className="mr-2 h-4 w-4" />
                Nouveau bail
              </Button>
            </div>
          ) : (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Propriété</TableHead>
                      <TableHead>Locataire</TableHead>
                      <TableHead>Période</TableHead>
                      <TableHead>Loyer</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead>Expiration</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
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
                        <TableRow key={lease.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium flex items-center gap-2">
                                <Building2 className="h-3 w-3 text-muted-foreground" />
                                {lease.property.name}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {lease.property.city}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <User className="h-3 w-3 text-muted-foreground" />
                              <div>
                                <div className="font-medium">
                                  {lease.tenant.name}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  {lease.tenant.email}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 text-sm">
                              <Calendar className="h-3 w-3 text-muted-foreground" />
                              <div>
                                <div>
                                  {new Date(
                                    lease.startDate
                                  ).toLocaleDateString("fr-FR")}
                                </div>
                                <div className="text-muted-foreground">
                                  au{" "}
                                  {new Date(lease.endDate).toLocaleDateString(
                                    "fr-FR"
                                  )}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 font-semibold">
                              <DollarSign className="h-3 w-3 text-green-600" />
                              {lease.monthlyRent.toLocaleString()} FCFA
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={statusColors[lease.status]}>
                              {statusLabels[lease.status]}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {lease.status === "ACTIVE" && (
                              <div className="text-sm">
                                {daysUntilExpiry > 0 ? (
                                  <span
                                    className={
                                      isExpiringSoon
                                        ? "text-orange-600 font-medium"
                                        : "text-muted-foreground"
                                    }
                                  >
                                    {daysUntilExpiry} jour
                                    {daysUntilExpiry > 1 ? "s" : ""}
                                  </span>
                                ) : (
                                  <span className="text-destructive font-medium">
                                    Expiré
                                  </span>
                                )}
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => router.push(`/leases/${lease.id}`)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
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
                        setPagination((prev) => ({
                          ...prev,
                          page: prev.page - 1,
                        }))
                      }
                      disabled={pagination.page === 1}
                    >
                      Précédent
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setPagination((prev) => ({
                          ...prev,
                          page: prev.page + 1,
                        }))
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
