"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Trash2,
  User,
  Building2,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Download,
  FileText,
  Mail,
  Phone,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { PaymentDetailsSkeleton } from "@/components/payments/payment-details-skeleton";
import {
  PAYMENT_METHOD_LABELS,
  formatDate,
  getDaysOverdue,
  overdueLabel,
  paymentMethodLabel,
} from "@/components/payments/payment-helpers";
import { formatCurrency, cn } from "@/lib/utils";

interface Payment {
  id: string;
  amount: number;
  dueDate: string;
  periodStart: string | null;
  periodEnd: string | null;
  paidDate: string | null;
  status: string;
  paymentMethod: string | null;
  transactionId: string | null;
  notes: string | null;
  lease: {
    id: string;
    property: {
      id: string;
      name: string;
      address: string;
      city: string;
      owner: {
        name: string;
        email: string;
      };
    };
    tenant: {
      id: string;
      name: string;
      email: string;
      phone: string;
    };
  };
}

function DetailItem({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1", className)}>
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="text-sm font-medium">{children}</dd>
    </div>
  );
}

export default function PaymentDetailsPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [payment, setPayment] = useState<Payment | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [markPaidDialogOpen, setMarkPaidDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isMarkingPaid, setIsMarkingPaid] = useState(false);

  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [transactionId, setTransactionId] = useState("");
  const [paidDate, setPaidDate] = useState(new Date().toISOString().split("T")[0]);

  useEffect(() => {
    fetchPayment();
  }, [params.id]);

  const fetchPayment = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/payments/${params.id}`);

      if (!response.ok) {
        throw new Error("Paiement non trouvé");
      }

      const data = await response.json();
      setPayment(data);
    } catch (error) {
      console.error("Erreur:", error);
      toast.error("Erreur lors du chargement du paiement");
      router.push("/payments");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/payments/${params.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erreur lors de la suppression");
      }

      toast.success("Paiement supprimé avec succès");
      router.push("/payments");
    } catch (error) {
      console.error("Erreur:", error);
      toast.error(
        error instanceof Error ? error.message : "Erreur lors de la suppression"
      );
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  const handleMarkPaid = async () => {
    setIsMarkingPaid(true);
    try {
      const response = await fetch(`/api/payments/${params.id}/mark-paid`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          paymentMethod,
          transactionId: transactionId || undefined,
          paidDate: new Date(paidDate).toISOString(),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erreur lors du marquage");
      }

      toast.success("Paiement marqué comme payé");
      fetchPayment();
    } catch (error) {
      console.error("Erreur:", error);
      toast.error(
        error instanceof Error ? error.message : "Erreur lors du marquage"
      );
    } finally {
      setIsMarkingPaid(false);
      setMarkPaidDialogOpen(false);
    }
  };

  if (loading) {
    return <PaymentDetailsSkeleton />;
  }

  if (!payment) {
    return null;
  }

  const daysOverdue = getDaysOverdue(payment.dueDate);
  const isOverdue = payment.status !== "PAID" && daysOverdue > 0;
  const isPaid = payment.status === "PAID";
  const method = paymentMethodLabel(payment.paymentMethod);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Détails du paiement"
        description={`${payment.lease.property.name} · ${payment.lease.tenant.name}`}
        backHref="/payments"
        actions={
          <>
            {!isPaid && (
              <Button onClick={() => setMarkPaidDialogOpen(true)}>
                <CheckCircle2 className="h-4 w-4" aria-hidden />
                Marquer comme payé
              </Button>
            )}
            {isPaid && (
              <Button variant="outline">
                <Download className="h-4 w-4" aria-hidden />
                Télécharger le reçu
              </Button>
            )}
            <Button
              variant="outline"
              className="text-destructive hover:text-destructive"
              onClick={() => setDeleteDialogOpen(true)}
            >
              <Trash2 className="h-4 w-4" aria-hidden />
              Supprimer
            </Button>
          </>
        }
      >
        <StatusBadge kind="payment" status={payment.status} />
        {isOverdue && (
          <span className="text-xs font-medium text-destructive">
            {overdueLabel(daysOverdue)}
          </span>
        )}
      </PageHeader>

      {isOverdue && (
        <div
          role="alert"
          className="animate-fade-up flex items-start gap-3 rounded-xl border border-destructive/25 bg-destructive/5 px-4 py-3"
          style={{ "--stagger": 1 } as React.CSSProperties}
        >
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" aria-hidden />
          <div className="text-sm">
            <p className="font-medium text-destructive">
              Ce paiement est en retard de {daysOverdue} jour{daysOverdue > 1 ? "s" : ""}.
            </p>
            <p className="text-muted-foreground">
              Échéance au {formatDate(payment.dueDate)}. Marquez-le comme payé dès réception.
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Informations principales */}
        <div className="space-y-6 lg:col-span-2">
          <Card className="animate-fade-up" style={{ "--stagger": 2 } as React.CSSProperties}>
            <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Montant</p>
                <p
                  className={cn(
                    "mt-1 text-4xl font-semibold tabular-nums tracking-tight",
                    isOverdue && "text-destructive"
                  )}
                >
                  {formatCurrency(payment.amount)}
                </p>
              </div>
              <div className="text-sm sm:text-right">
                <p className="text-muted-foreground">Échéance</p>
                <p className="font-medium tabular-nums">{formatDate(payment.dueDate)}</p>
                {isPaid && payment.paidDate && (
                  <p className="mt-1 text-xs text-success">
                    Réglé le {formatDate(payment.paidDate)}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="animate-fade-up" style={{ "--stagger": 3 } as React.CSSProperties}>
            <CardHeader>
              <CardTitle>Informations</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-5 sm:grid-cols-2">
                <DetailItem label="Date d'échéance">
                  <span className="tabular-nums">{formatDate(payment.dueDate)}</span>
                </DetailItem>
                <DetailItem label="Période couverte">
                  {payment.periodStart && payment.periodEnd ? (
                    <span className="tabular-nums">
                      Du {formatDate(payment.periodStart)} au {formatDate(payment.periodEnd)}
                    </span>
                  ) : (
                    <span className="font-normal text-muted-foreground">—</span>
                  )}
                </DetailItem>
                {isPaid && (
                  <DetailItem label="Date de paiement">
                    {payment.paidDate ? (
                      <span className="tabular-nums">{formatDate(payment.paidDate)}</span>
                    ) : (
                      <span className="font-normal text-muted-foreground">—</span>
                    )}
                  </DetailItem>
                )}
                <DetailItem label="Méthode de paiement">
                  {method ?? <span className="font-normal text-muted-foreground">—</span>}
                </DetailItem>
                <DetailItem label="Référence de transaction">
                  {payment.transactionId ? (
                    <span className="font-mono text-sm">{payment.transactionId}</span>
                  ) : (
                    <span className="font-normal text-muted-foreground">—</span>
                  )}
                </DetailItem>
                <DetailItem label="Notes" className="sm:col-span-2">
                  {payment.notes ? (
                    <span className="whitespace-pre-wrap font-normal">{payment.notes}</span>
                  ) : (
                    <span className="font-normal text-muted-foreground">Aucune note</span>
                  )}
                </DetailItem>
              </dl>
            </CardContent>
          </Card>
        </div>

        {/* Cartes latérales */}
        <div className="space-y-6">
          <Card className="animate-fade-up" style={{ "--stagger": 4 } as React.CSSProperties}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Building2 className="h-4 w-4 text-muted-foreground" aria-hidden />
                Bien
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="font-medium">{payment.lease.property.name}</p>
                <p className="text-sm text-muted-foreground">
                  {payment.lease.property.address}
                </p>
                <p className="text-sm text-muted-foreground">
                  {payment.lease.property.city}
                </p>
              </div>
              <Button variant="ghost" size="sm" className="-ml-2.5 h-9" asChild>
                <Link href={`/properties/${payment.lease.property.id}`}>
                  Voir le bien
                  <ChevronRight className="h-4 w-4" aria-hidden />
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="animate-fade-up" style={{ "--stagger": 5 } as React.CSSProperties}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <User className="h-4 w-4 text-muted-foreground" aria-hidden />
                Locataire
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1">
                <p className="font-medium">{payment.lease.tenant.name}</p>
                <a
                  href={`mailto:${payment.lease.tenant.email}`}
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground hover:underline"
                >
                  <Mail className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  <span className="truncate">{payment.lease.tenant.email}</span>
                </a>
                {payment.lease.tenant.phone && (
                  <a
                    href={`tel:${payment.lease.tenant.phone}`}
                    className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground hover:underline"
                  >
                    <Phone className="h-3.5 w-3.5 shrink-0" aria-hidden />
                    {payment.lease.tenant.phone}
                  </a>
                )}
              </div>
              <Button variant="ghost" size="sm" className="-ml-2.5 h-9" asChild>
                <Link href={`/tenants/${payment.lease.tenant.id}`}>
                  Voir le locataire
                  <ChevronRight className="h-4 w-4" aria-hidden />
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="animate-fade-up" style={{ "--stagger": 6 } as React.CSSProperties}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="h-4 w-4 text-muted-foreground" aria-hidden />
                Bail
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Propriétaire : {payment.lease.property.owner.name}
              </p>
              <Button variant="ghost" size="sm" className="-ml-2.5 h-9" asChild>
                <Link href={`/leases/${payment.lease.id}`}>
                  Voir le bail
                  <ChevronRight className="h-4 w-4" aria-hidden />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Dialog de suppression */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer ce paiement ? Cette action est
              irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog marquer comme payé */}
      <Dialog open={markPaidDialogOpen} onOpenChange={setMarkPaidDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Marquer comme payé</DialogTitle>
            <DialogDescription>
              Confirmez la réception du paiement
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="paymentMethod">Méthode de paiement</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger id="paymentMethod" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PAYMENT_METHOD_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="paidDate">Date de paiement</Label>
              <Input
                id="paidDate"
                type="date"
                value={paidDate}
                onChange={(e) => setPaidDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="transactionId">ID de transaction (optionnel)</Label>
              <Input
                id="transactionId"
                value={transactionId}
                onChange={(e) => setTransactionId(e.target.value)}
                placeholder="Ex: TXN123456"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setMarkPaidDialogOpen(false)}
              disabled={isMarkingPaid}
            >
              Annuler
            </Button>
            <Button onClick={handleMarkPaid} disabled={isMarkingPaid}>
              {isMarkingPaid && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirmer le paiement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
