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
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CreditCard,
  Plus,
  Search,
  ChevronRight,
  Clock,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge, statusLabel } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { TableSkeleton } from "@/components/shared/page-skeleton";
import { StatCard } from "@/components/dashboard/stat-card";
import { formatCurrency, cn } from "@/lib/utils";
import {
  formatDate,
  getDaysOverdue,
  overdueLabel,
  paymentMethodLabel,
} from "@/components/payments/payment-helpers";

interface Payment {
  id: string;
  amount: number;
  dueDate: string;
  paidDate: string | null;
  status: string;
  paymentMethod: string | null;
  lease: {
    id: string;
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
  };
}

interface PaginationData {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const PAYMENT_STATUSES = ["PENDING", "PAID", "OVERDUE", "CANCELLED"];

export default function PaymentsPage() {
  const router = useRouter();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [pagination, setPagination] = useState<PaginationData>({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      });

      if (statusFilter !== "all") {
        params.append("status", statusFilter);
      }

      const response = await fetch(`/api/payments?${params}`);

      if (!response.ok) {
        throw new Error("Erreur lors du chargement des paiements");
      }

      const data = await response.json();
      setPayments(data.payments);
      setPagination(data.pagination);
    } catch (error) {
      console.error("Erreur:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, [pagination.page, statusFilter]);

  const filteredPayments = payments.filter(
    (payment) =>
      payment.lease.property.name
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      payment.lease.tenant.name
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      payment.lease.property.city
        .toLowerCase()
        .includes(searchTerm.toLowerCase())
  );

  const isFiltered = searchTerm.trim() !== "" || statusFilter !== "all";
  const countByStatus = (status: string) =>
    payments.filter((p) => p.status === status).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Paiements"
        description="Suivez les paiements de loyers et leurs échéances"
        actions={
          <Button onClick={() => router.push("/payments/new")}>
            <Plus className="h-4 w-4" aria-hidden />
            Nouveau paiement
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          index={0}
          title="Total"
          value={pagination.total}
          description="Tous statuts confondus"
          icon={CreditCard}
        />
        <StatCard
          index={1}
          title="En attente"
          value={countByStatus("PENDING")}
          description="Sur cette page"
          icon={Clock}
        />
        <StatCard
          index={2}
          title="Payés"
          value={countByStatus("PAID")}
          description="Sur cette page"
          icon={CheckCircle2}
          tone="success"
        />
        <StatCard
          index={3}
          title="En retard"
          value={countByStatus("OVERDUE")}
          description="Sur cette page"
          icon={AlertCircle}
          tone="danger"
        />
      </div>

      <Card className="animate-fade-up" style={{ "--stagger": 4 } as React.CSSProperties}>
        <CardHeader className="gap-4 sm:flex sm:flex-row sm:items-center sm:justify-between">
          <CardTitle>Liste des paiements</CardTitle>
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <Input
                type="search"
                placeholder="Bien, locataire, ville…"
                aria-label="Rechercher un paiement"
                className="w-full pl-9 sm:w-[240px]"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[160px]" aria-label="Filtrer par statut">
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                {PAYMENT_STATUSES.map((value) => (
                  <SelectItem key={value} value={value}>
                    {statusLabel("payment", value)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <TableSkeleton rows={6} />
          ) : filteredPayments.length === 0 ? (
            <EmptyState
              icon={CreditCard}
              title="Aucun paiement trouvé"
              description={
                isFiltered
                  ? "Aucun paiement ne correspond à ces critères."
                  : "Commencez par enregistrer un paiement de loyer."
              }
              action={
                !isFiltered ? (
                  <Button onClick={() => router.push("/payments/new")}>
                    <Plus className="h-4 w-4" aria-hidden />
                    Nouveau paiement
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <>
              <div className="overflow-hidden rounded-lg border">
                <Table className="[&_td]:px-3 [&_td]:py-3 [&_th]:px-3">
                  <TableHeader>
                    <TableRow className="bg-muted/40 hover:bg-muted/40">
                      <TableHead>Bien</TableHead>
                      <TableHead>Locataire</TableHead>
                      <TableHead className="text-right">Montant</TableHead>
                      <TableHead>Échéance</TableHead>
                      <TableHead>Méthode</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead className="w-12">
                        <span className="sr-only">Ouvrir</span>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPayments.map((payment) => {
                      const daysOverdue = getDaysOverdue(payment.dueDate);
                      const isOverdue =
                        payment.status !== "PAID" && daysOverdue > 0;
                      const method = paymentMethodLabel(payment.paymentMethod);

                      return (
                        <TableRow
                          key={payment.id}
                          className="cursor-pointer hover:bg-muted/50 transition-colors"
                          onClick={() => router.push(`/payments/${payment.id}`)}
                        >
                          <TableCell>
                            <div className="font-medium">
                              {payment.lease.property.name}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {payment.lease.property.city}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">
                              {payment.lease.tenant.name}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {payment.lease.tenant.email}
                            </div>
                          </TableCell>
                          <TableCell
                            className={cn(
                              "text-right tabular-nums",
                              isOverdue ? "font-medium text-destructive" : "font-medium"
                            )}
                          >
                            {formatCurrency(payment.amount)}
                          </TableCell>
                          <TableCell>
                            <div className="tabular-nums">{formatDate(payment.dueDate)}</div>
                            {isOverdue && (
                              <div className="text-xs font-medium text-destructive">
                                {overdueLabel(daysOverdue)}
                              </div>
                            )}
                            {payment.status === "PAID" && payment.paidDate && (
                              <div className="text-xs text-muted-foreground">
                                Payé le {formatDate(payment.paidDate)}
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            {method ? (
                              <span>{method}</span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <StatusBadge kind="payment" status={payment.status} />
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              aria-label={`Voir le paiement de ${payment.lease.tenant.name}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                router.push(`/payments/${payment.id}`);
                              }}
                            >
                              <ChevronRight className="h-4 w-4" aria-hidden />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {pagination.totalPages > 1 && (
                <div className="mt-4 flex items-center justify-between gap-4">
                  <p className="text-sm text-muted-foreground tabular-nums">
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
