"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
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
  ArrowLeft,
  Mail,
  Phone,
  Plus,
  FileText,
  ChevronRight,
  Receipt,
  CheckCircle2,
  AlertCircle,
  CalendarClock,
  UserX,
} from "lucide-react";
import { formatCurrency, cn } from "@/lib/utils";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { StatCard } from "@/components/dashboard/stat-card";
import { TenantAvatar } from "@/components/tenants/tenant-avatar";
import { TenantDetailsSkeleton } from "@/components/tenants/tenant-details-skeleton";

interface Payment {
  id: string;
  amount: number;
  status: string;
  dueDate: string;
  paidDate: string | null;
  periodStart: string | null;
}

interface Lease {
  id: string;
  status: string;
  startDate: string;
  endDate: string;
  monthlyRent: number;
  property: { id: string; name: string; address: string; city: string };
  payments: Payment[];
}

interface TenantDetails {
  tenant: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    avatar: string | null;
    createdAt: string;
    leases: Lease[];
  };
  summary: {
    totalPaid: number;
    overdueAmount: number;
    overdueCount: number;
    nextDuePayment: { id: string; amount: number; dueDate: string } | null;
  };
}

const RECENT_PAYMENTS_LIMIT = 10;

const formatDate = (date: string) =>
  new Date(date).toLocaleDateString("fr-FR", { timeZone: "UTC" });

const formatPeriod = (date: string) =>
  new Date(date).toLocaleDateString("fr-FR", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

const tableClass = "[&_td]:px-3 [&_td]:py-3 [&_th]:px-3";

export default function TenantDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const [data, setData] = useState<TenantDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const fetchTenant = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/tenants/${id}`);
        if (!response.ok) {
          if (!cancelled) setNotFound(true);
          return;
        }
        const json = await response.json();
        if (!cancelled) setData(json);
      } catch (error) {
        console.error("Erreur:", error);
        if (!cancelled) setNotFound(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchTenant();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return <TenantDetailsSkeleton />;
  }

  if (notFound || !data) {
    return (
      <EmptyState
        icon={UserX}
        title="Locataire introuvable"
        description="Ce locataire n'existe pas ou n'a aucun bail sur vos biens."
        action={
          <Button variant="outline" onClick={() => router.push("/tenants")}>
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Retour aux locataires
          </Button>
        }
      />
    );
  }

  const { tenant, summary } = data;

  // Échéances passées ou réglées : les échéances futures du calendrier ne sont pas « récentes »
  const now = Date.now();
  const recentPayments = tenant.leases
    .flatMap((lease) =>
      lease.payments.map((payment) => ({ ...payment, propertyName: lease.property.name }))
    )
    .filter((payment) => payment.status === "PAID" || new Date(payment.dueDate).getTime() <= now)
    .sort((a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime())
    .slice(0, RECENT_PAYMENTS_LIMIT);

  const activeLeaseCount = tenant.leases.filter((l) => l.status === "ACTIVE").length;

  return (
    <div className="space-y-6">
      <PageHeader
        title={tenant.name}
        description={`Locataire depuis le ${formatDate(tenant.createdAt)}`}
        backHref="/tenants"
        actions={
          <Button onClick={() => router.push(`/leases/new?tenantId=${tenant.id}`)}>
            <Plus className="h-4 w-4" aria-hidden />
            Nouveau bail
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card
          className="animate-fade-up gap-0 py-5 sm:col-span-2 lg:col-span-1"
          style={{ "--stagger": 0 } as React.CSSProperties}
        >
          <CardContent className="flex items-center gap-4 px-5">
            <TenantAvatar name={tenant.name} src={tenant.avatar} size="lg" />
            <div className="min-w-0 space-y-1 text-sm">
              <p className="truncate font-medium">{tenant.name}</p>
              <a
                href={`mailto:${tenant.email}`}
                className="flex items-center gap-1.5 truncate text-muted-foreground hover:text-foreground hover:underline"
              >
                <Mail className="h-3.5 w-3.5 shrink-0" aria-hidden />
                <span className="truncate">{tenant.email}</span>
              </a>
              {tenant.phone ? (
                <a
                  href={`tel:${tenant.phone}`}
                  className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground hover:underline"
                >
                  <Phone className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  {tenant.phone}
                </a>
              ) : (
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <Phone className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  Pas de téléphone
                </span>
              )}
            </div>
          </CardContent>
        </Card>
        <StatCard
          index={1}
          title="Total payé"
          value={formatCurrency(summary.totalPaid)}
          icon={CheckCircle2}
          tone="success"
        />
        <StatCard
          index={2}
          title="Impayés"
          value={formatCurrency(summary.overdueAmount)}
          description={
            summary.overdueCount > 0
              ? `${summary.overdueCount} échéance${summary.overdueCount > 1 ? "s" : ""} en retard`
              : "À jour"
          }
          icon={AlertCircle}
          tone={summary.overdueAmount > 0 ? "danger" : "default"}
        />
        <StatCard
          index={3}
          title="Prochaine échéance"
          value={summary.nextDuePayment ? formatCurrency(summary.nextDuePayment.amount) : "Aucune"}
          description={
            summary.nextDuePayment ? `Le ${formatDate(summary.nextDuePayment.dueDate)}` : undefined
          }
          icon={CalendarClock}
          tone={summary.nextDuePayment ? "primary" : "default"}
        />
      </div>

      <Card className="animate-fade-up" style={{ "--stagger": 4 } as React.CSSProperties}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" aria-hidden />
            Baux{" "}
            <span className="font-normal text-muted-foreground tabular-nums">
              ({tenant.leases.length}
              {activeLeaseCount > 0 ? `, ${activeLeaseCount} actif${activeLeaseCount > 1 ? "s" : ""}` : ""})
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {tenant.leases.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="Aucun bail"
              description="Ce locataire n'a encore aucun bail sur vos biens."
              className="py-10"
            />
          ) : (
            <div className="overflow-hidden rounded-lg border">
              <Table className={tableClass}>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead>Bien</TableHead>
                    <TableHead>Période</TableHead>
                    <TableHead className="text-right">Loyer</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="w-12">
                      <span className="sr-only">Ouvrir</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tenant.leases.map((lease) => (
                    <TableRow
                      key={lease.id}
                      className="cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => router.push(`/leases/${lease.id}`)}
                    >
                      <TableCell>
                        <div className="font-medium">{lease.property.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {lease.property.address}, {lease.property.city}
                        </div>
                      </TableCell>
                      <TableCell className="tabular-nums">
                        {formatDate(lease.startDate)} au {formatDate(lease.endDate)}
                      </TableCell>
                      <TableCell className="text-right font-medium tabular-nums">
                        {formatCurrency(lease.monthlyRent)}
                      </TableCell>
                      <TableCell>
                        <StatusBadge kind="lease" status={lease.status} />
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/leases/${lease.id}`);
                          }}
                          aria-label={`Voir le bail ${lease.property.name}`}
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

      <Card className="animate-fade-up" style={{ "--stagger": 5 } as React.CSSProperties}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-4 w-4 text-muted-foreground" aria-hidden />
            Derniers paiements
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentPayments.length === 0 ? (
            <EmptyState
              icon={Receipt}
              title="Aucun paiement enregistré"
              description="Les échéances passées et réglées apparaîtront ici."
              className="py-10"
            />
          ) : (
            <div className="overflow-hidden rounded-lg border">
              <Table className={tableClass}>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead>Échéance</TableHead>
                    <TableHead>Bien</TableHead>
                    <TableHead className="text-right">Montant</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="w-12">
                      <span className="sr-only">Ouvrir</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentPayments.map((payment) => {
                    const isOverdue = payment.status === "OVERDUE";
                    return (
                      <TableRow
                        key={payment.id}
                        className="cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => router.push(`/payments/${payment.id}`)}
                      >
                        <TableCell>
                          <div className="tabular-nums">{formatDate(payment.dueDate)}</div>
                          {payment.periodStart && (
                            <div className="text-xs capitalize text-muted-foreground">
                              {formatPeriod(payment.periodStart)}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>{payment.propertyName}</TableCell>
                        <TableCell
                          className={cn(
                            "text-right font-medium tabular-nums",
                            isOverdue && "text-destructive"
                          )}
                        >
                          {formatCurrency(payment.amount)}
                        </TableCell>
                        <TableCell>
                          <StatusBadge kind="payment" status={payment.status} />
                          {payment.status === "PAID" && payment.paidDate && (
                            <div className="mt-1 text-xs text-muted-foreground">
                              Le {formatDate(payment.paidDate)}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/payments/${payment.id}`);
                            }}
                            aria-label={`Voir le paiement du ${formatDate(payment.dueDate)}`}
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
          )}
        </CardContent>
      </Card>
    </div>
  );
}
