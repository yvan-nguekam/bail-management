"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  Loader2,
  Mail,
  Phone,
  Plus,
  FileText,
  Eye,
  Building2,
  Receipt,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";

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

const leaseStatusLabels: Record<string, string> = {
  DRAFT: "Brouillon",
  ACTIVE: "Actif",
  EXPIRED: "Expiré",
  TERMINATED: "Résilié",
  RENEWED: "Renouvelé",
};

const leaseStatusColors: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  DRAFT: "outline",
  ACTIVE: "default",
  EXPIRED: "destructive",
  TERMINATED: "secondary",
  RENEWED: "secondary",
};

const paymentStatusLabels: Record<string, string> = {
  PENDING: "En attente",
  PAID: "Payé",
  OVERDUE: "En retard",
  CANCELLED: "Annulé",
};

const paymentStatusColors: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  PENDING: "outline",
  PAID: "default",
  OVERDUE: "destructive",
  CANCELLED: "secondary",
};

const RECENT_PAYMENTS_LIMIT = 10;

const formatDate = (date: string) =>
  new Date(date).toLocaleDateString("fr-FR", { timeZone: "UTC" });

const formatPeriod = (date: string) =>
  new Date(date).toLocaleDateString("fr-FR", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

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
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (notFound || !data) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-semibold">Locataire introuvable</h3>
        <p className="text-muted-foreground">
          Ce locataire n&apos;existe pas ou n&apos;a aucun bail sur vos biens.
        </p>
        <Button className="mt-4" variant="outline" onClick={() => router.push("/tenants")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Retour aux locataires
        </Button>
      </div>
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push("/tenants")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{tenant.name}</h1>
            <p className="text-muted-foreground">
              Compte créé le {formatDate(tenant.createdAt)}
            </p>
          </div>
        </div>
        <Button onClick={() => router.push(`/leases/new?tenantId=${tenant.id}`)}>
          <Plus className="mr-2 h-4 w-4" />
          Nouveau bail
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Contact</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center gap-3">
              <Avatar>
                {tenant.avatar && <AvatarImage src={tenant.avatar} alt={tenant.name} />}
                <AvatarFallback>{initials(tenant.name)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 space-y-1 text-sm">
                <a
                  href={`mailto:${tenant.email}`}
                  className="flex items-center gap-1 truncate hover:underline"
                >
                  <Mail className="h-3 w-3 shrink-0 text-muted-foreground" />
                  {tenant.email}
                </a>
                {tenant.phone ? (
                  <a
                    href={`tel:${tenant.phone}`}
                    className="flex items-center gap-1 hover:underline"
                  >
                    <Phone className="h-3 w-3 shrink-0 text-muted-foreground" />
                    {tenant.phone}
                  </a>
                ) : (
                  <span className="text-muted-foreground">Pas de téléphone</span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total payé</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(summary.totalPaid)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Impayés</CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${summary.overdueAmount > 0 ? "text-destructive" : ""}`}
            >
              {formatCurrency(summary.overdueAmount)}
            </div>
            <p className="text-xs text-muted-foreground">
              {summary.overdueCount > 0
                ? `${summary.overdueCount} échéance${summary.overdueCount > 1 ? "s" : ""} en retard`
                : "À jour"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Prochaine échéance</CardTitle>
          </CardHeader>
          <CardContent>
            {summary.nextDuePayment ? (
              <>
                <div className="text-2xl font-bold">
                  {formatCurrency(summary.nextDuePayment.amount)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Le {formatDate(summary.nextDuePayment.dueDate)}
                </p>
              </>
            ) : (
              <div className="text-muted-foreground">Aucune</div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Baux ({tenant.leases.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Bien</TableHead>
                  <TableHead>Période</TableHead>
                  <TableHead>Loyer</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tenant.leases.map((lease) => (
                  <TableRow key={lease.id}>
                    <TableCell>
                      <div className="font-medium flex items-center gap-2">
                        <Building2 className="h-3 w-3 text-muted-foreground" />
                        {lease.property.name}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {lease.property.address}, {lease.property.city}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {formatDate(lease.startDate)} au {formatDate(lease.endDate)}
                    </TableCell>
                    <TableCell className="font-semibold">
                      {formatCurrency(lease.monthlyRent)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={leaseStatusColors[lease.status]}>
                        {leaseStatusLabels[lease.status] ?? lease.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.push(`/leases/${lease.id}`)}
                        aria-label="Voir le bail"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Derniers paiements
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentPayments.length === 0 ? (
            <p className="py-6 text-center text-muted-foreground">Aucun paiement enregistré</p>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Échéance</TableHead>
                    <TableHead>Bien</TableHead>
                    <TableHead>Montant</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentPayments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell>
                        <div>{formatDate(payment.dueDate)}</div>
                        {payment.periodStart && (
                          <div className="text-sm text-muted-foreground capitalize">
                            {formatPeriod(payment.periodStart)}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>{payment.propertyName}</TableCell>
                      <TableCell className="font-semibold">
                        {formatCurrency(payment.amount)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={paymentStatusColors[payment.status]}>
                          {paymentStatusLabels[payment.status] ?? payment.status}
                        </Badge>
                        {payment.status === "PAID" && payment.paidDate && (
                          <div className="text-xs text-muted-foreground">
                            Le {formatDate(payment.paidDate)}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => router.push(`/payments/${payment.id}`)}
                          aria-label="Voir le paiement"
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
