"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Pencil,
  Trash2,
  CalendarDays,
  CalendarCheck,
  Wallet,
  ShieldCheck,
  User,
  Building2,
  Loader2,
  RefreshCw,
  XCircle,
  AlertCircle,
  CalendarClock,
  Download,
  MoreHorizontal,
  Mail,
  Phone,
  ArrowUpRight,
} from "lucide-react";
import { PaymentScheduleTable } from "@/components/leases/payment-schedule-table";
import { DepositCard } from "@/components/leases/deposit-card";
import { PageHeader } from "@/components/shared/page-header";
import { PageSkeleton } from "@/components/shared/page-skeleton";
import { StatusBadge } from "@/components/shared/status-badge";
import { InfoItem } from "@/components/properties/info-item";
import { formatDay, propertyTypeLabel } from "@/components/properties/property-labels";
import { formatCurrency, cn } from "@/lib/utils";
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

interface Lease {
  id: string;
  startDate: string;
  endDate: string;
  monthlyRent: number;
  securityDeposit: number;
  status: string;
  terms: string;
  property: {
    id: string;
    name: string;
    address: string;
    city: string;
    type: string;
    owner: {
      name: string;
      email: string;
      phone: string;
    };
  };
  tenant: {
    id: string;
    name: string;
    email: string;
    phone: string;
  };
  payments: Array<{
    id: string;
    amount: number;
    dueDate: string;
    periodStart: string | null;
    periodEnd: string | null;
    status: string;
  }>;
}

export default function LeaseDetailsPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { data: session } = useSession();
  const [lease, setLease] = useState<Lease | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [renewDialogOpen, setRenewDialogOpen] = useState(false);
  const [terminateDialogOpen, setTerminateDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRenewing, setIsRenewing] = useState(false);
  const [isTerminating, setIsTerminating] = useState(false);
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [isSyncingSchedule, setIsSyncingSchedule] = useState(false);

  const [renewEndDate, setRenewEndDate] = useState("");
  const [renewRent, setRenewRent] = useState("");
  const [terminationDate, setTerminationDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [terminationReason, setTerminationReason] = useState("");

  useEffect(() => {
    fetchLease();
  }, [params.id]);

  const fetchLease = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/leases/${params.id}`);

      if (!response.ok) {
        throw new Error("Bail non trouvé");
      }

      const data = await response.json();
      setLease(data);
      setRenewRent(data.monthlyRent.toString());
    } catch (error) {
      console.error("Erreur:", error);
      toast.error("Erreur lors du chargement du bail");
      router.push("/leases");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/leases/${params.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erreur lors de la suppression");
      }

      toast.success("Bail supprimé avec succès");
      router.push("/leases");
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

  const handleRenew = async () => {
    if (!renewEndDate || !renewRent) {
      toast.error("Veuillez remplir tous les champs");
      return;
    }

    setIsRenewing(true);
    try {
      const response = await fetch(`/api/leases/${params.id}/renew`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          newEndDate: new Date(renewEndDate).toISOString(),
          newMonthlyRent: parseFloat(renewRent),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erreur lors du renouvellement");
      }

      const newLease = await response.json();
      toast.success("Bail renouvelé avec succès");
      router.push(`/leases/${newLease.id}`);
    } catch (error) {
      console.error("Erreur:", error);
      toast.error(
        error instanceof Error ? error.message : "Erreur lors du renouvellement"
      );
    } finally {
      setIsRenewing(false);
      setRenewDialogOpen(false);
    }
  };

  const handleTerminate = async () => {
    if (!terminationDate) {
      toast.error("Veuillez saisir une date de résiliation");
      return;
    }

    setIsTerminating(true);
    try {
      const response = await fetch(`/api/leases/${params.id}/terminate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          terminationDate: new Date(terminationDate).toISOString(),
          reason: terminationReason,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erreur lors de la résiliation");
      }

      toast.success("Bail résilié avec succès");
      fetchLease();
    } catch (error) {
      console.error("Erreur:", error);
      toast.error(
        error instanceof Error ? error.message : "Erreur lors de la résiliation"
      );
    } finally {
      setIsTerminating(false);
      setTerminateDialogOpen(false);
    }
  };

  const handleSyncSchedule = async () => {
    setIsSyncingSchedule(true);
    try {
      const response = await fetch(`/api/leases/${params.id}/schedule`, {
        method: "POST",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erreur lors de la génération de l'échéancier");
      }

      const result = await response.json();
      toast.success(
        `Échéancier mis à jour : ${result.created} échéance(s) générée(s), ${result.kept} conservée(s)`
      );
      fetchLease();
    } catch (error) {
      console.error("Erreur:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Erreur lors de la génération de l'échéancier"
      );
    } finally {
      setIsSyncingSchedule(false);
      setScheduleDialogOpen(false);
    }
  };

  const handleDownloadContract = async () => {
    if (!lease) return;
    try {
      const { downloadLeaseContract } = await import("@/lib/lease-contract-pdf");
      downloadLeaseContract(lease);
    } catch (error) {
      console.error("Erreur:", error);
      toast.error("Erreur lors de la génération du contrat");
    }
  };

  if (loading) {
    return <PageSkeleton stats={0} />;
  }

  if (!lease) {
    return null;
  }

  const daysUntilExpiry = Math.ceil(
    (new Date(lease.endDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
  );
  const isExpiringSoon = lease.status === "ACTIVE" && daysUntilExpiry > 0 && daysUntilExpiry <= 30;

  // Les actions de gestion sont réservées au personnel (l'API les bloque pour les locataires)
  const isStaff = !!session?.user && session.user.role !== "TENANT";
  const canManageSchedule = isStaff && lease.status !== "RENEWED";
  const canRenewOrTerminate = isStaff && lease.status === "ACTIVE";
  const billedPayments = lease.payments.filter((p) => p.status !== "CANCELLED");
  const totalPaid = billedPayments
    .filter((p) => p.status === "PAID")
    .reduce((sum, p) => sum + p.amount, 0);
  const totalDue = billedPayments
    .filter((p) => p.status !== "PAID")
    .reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Détails du bail"
        description={`${lease.property.name} · ${lease.tenant.name}`}
        backHref="/leases"
        actions={
          <>
            <Button variant="outline" onClick={handleDownloadContract}>
              <Download aria-hidden />
              Télécharger le contrat
            </Button>
            {isStaff && (
              <>
                <Button asChild>
                  <Link href={`/leases/${lease.id}/edit`}>
                    <Pencil aria-hidden />
                    Modifier
                  </Link>
                </Button>
                <DropdownMenu modal={false}>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon" aria-label="Plus d'actions">
                      <MoreHorizontal />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="min-w-48">
                    {canRenewOrTerminate && (
                      <>
                        <DropdownMenuItem onSelect={() => setRenewDialogOpen(true)}>
                          <RefreshCw />
                          Renouveler
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => setTerminateDialogOpen(true)}>
                          <XCircle />
                          Résilier
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                      </>
                    )}
                    <DropdownMenuItem
                      variant="destructive"
                      onSelect={() => setDeleteDialogOpen(true)}
                    >
                      <Trash2 />
                      Supprimer
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            )}
          </>
        }
      >
        <StatusBadge kind="lease" status={lease.status} />
        <Badge variant="outline">{propertyTypeLabel(lease.property.type)}</Badge>
        {isExpiringSoon && (
          <Badge variant="warning">
            Expire dans {daysUntilExpiry} jour{daysUntilExpiry > 1 ? "s" : ""}
          </Badge>
        )}
      </PageHeader>

      {isExpiringSoon && (
        <div
          className="animate-fade-up flex flex-col gap-3 rounded-xl border border-warning/30 bg-warning/10 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
          role="status"
          style={{ "--stagger": 1 } as React.CSSProperties}
        >
          <p className="flex items-start gap-3 text-sm">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden />
            <span>
              Ce bail expire dans{" "}
              <span className="font-semibold tabular-nums">
                {daysUntilExpiry} jour{daysUntilExpiry > 1 ? "s" : ""}
              </span>
              . Pensez à le renouveler.
            </span>
          </p>
          {canRenewOrTerminate && (
            <Button
              variant="outline"
              size="sm"
              className="shrink-0 bg-background"
              onClick={() => setRenewDialogOpen(true)}
            >
              <RefreshCw aria-hidden />
              Renouveler
            </Button>
          )}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Informations principales */}
        <Card
          className="animate-fade-up lg:col-span-2"
          style={{ "--stagger": 2 } as React.CSSProperties}
        >
          <CardHeader>
            <CardTitle>Informations du bail</CardTitle>
            <CardDescription>Période, loyer et conditions du contrat.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <InfoItem
                icon={CalendarDays}
                label="Date de début"
                value={formatDay(lease.startDate)}
              />
              <InfoItem
                icon={CalendarCheck}
                label="Date de fin"
                value={formatDay(lease.endDate)}
                tone={isExpiringSoon ? "warning" : "primary"}
              />
            </div>

            <Separator />

            <div className="grid gap-4 sm:grid-cols-2">
              <InfoItem
                icon={Wallet}
                label="Loyer mensuel"
                value={formatCurrency(lease.monthlyRent)}
              />
              <InfoItem
                icon={ShieldCheck}
                label="Caution"
                value={formatCurrency(lease.securityDeposit)}
                tone="default"
              />
            </div>

            {lease.terms && (
              <>
                <Separator />
                <div>
                  <h4 className="mb-2 text-sm font-semibold">Conditions du bail</h4>
                  <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                    {lease.terms}
                  </p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Colonne latérale */}
        <div className="space-y-6">
          {/* Bien */}
          <Card className="animate-fade-up" style={{ "--stagger": 3 } as React.CSSProperties}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Building2 className="h-4 w-4 text-muted-foreground" aria-hidden />
                Bien
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1">
                <p className="font-semibold">{lease.property.name}</p>
                <p className="text-sm text-muted-foreground">
                  {lease.property.address}, {lease.property.city}
                </p>
              </div>
              <Separator />
              <div className="space-y-1">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Propriétaire
                </p>
                <p className="text-sm font-medium">{lease.property.owner.name}</p>
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Mail className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  <span className="truncate">{lease.property.owner.email}</span>
                </p>
              </div>
              {isStaff && (
                <Button variant="outline" size="sm" className="w-full" asChild>
                  <Link href={`/properties/${lease.property.id}`}>
                    Voir le bien
                    <ArrowUpRight aria-hidden />
                  </Link>
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Locataire */}
          <Card className="animate-fade-up" style={{ "--stagger": 4 } as React.CSSProperties}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <User className="h-4 w-4 text-muted-foreground" aria-hidden />
                Locataire
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1">
                <p className="font-semibold">{lease.tenant.name}</p>
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Mail className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  <span className="truncate">{lease.tenant.email}</span>
                </p>
                {lease.tenant.phone && (
                  <p className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Phone className="h-3.5 w-3.5 shrink-0" aria-hidden />
                    {lease.tenant.phone}
                  </p>
                )}
              </div>
              {isStaff && (
                <Button variant="outline" size="sm" className="w-full" asChild>
                  <Link href={`/tenants/${lease.tenant.id}`}>
                    Voir le locataire
                    <ArrowUpRight aria-hidden />
                  </Link>
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <DepositCard leaseId={lease.id} leaseStatus={lease.status} />

      {/* Échéancier des loyers */}
      <Card className="animate-fade-up" style={{ "--stagger": 6 } as React.CSSProperties}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarClock className="h-5 w-5 text-muted-foreground" aria-hidden />
            Échéancier des loyers
          </CardTitle>
          <CardDescription>
            Une échéance par mois, du début à la fin du bail.
          </CardDescription>
          {canManageSchedule && (
            <CardAction>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setScheduleDialogOpen(true)}
              >
                <RefreshCw aria-hidden />
                {lease.payments.length > 0 ? "Régénérer" : "Générer"}
              </Button>
            </CardAction>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {lease.payments.length > 0 ? (
            <>
              <dl className="grid gap-4 rounded-lg border bg-muted/30 p-4 sm:grid-cols-3">
                <div>
                  <dt className="text-sm text-muted-foreground">Échéances</dt>
                  <dd className="font-semibold tabular-nums">{billedPayments.length}</dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">Payé</dt>
                  <dd className="font-semibold tabular-nums text-success">
                    {formatCurrency(totalPaid)}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">Restant dû</dt>
                  <dd
                    className={cn(
                      "font-semibold tabular-nums",
                      totalDue > 0 && "text-destructive"
                    )}
                  >
                    {formatCurrency(totalDue)}
                  </dd>
                </div>
              </dl>
              <div className="overflow-hidden rounded-lg border">
                <PaymentScheduleTable rows={lease.payments} />
              </div>
            </>
          ) : (
            <p className="rounded-lg border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
              Aucune échéance pour ce bail.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Dialog de génération de l'échéancier */}
      <AlertDialog open={scheduleDialogOpen} onOpenChange={setScheduleDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Régénérer l&apos;échéancier ?</AlertDialogTitle>
            <AlertDialogDescription>
              Les échéances non payées seront recalculées à partir des dates, du loyer et du
              jour de paiement actuels du bail. Les échéances payées ou annulées sont
              conservées.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSyncingSchedule}>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleSyncSchedule} disabled={isSyncingSchedule}>
              {isSyncingSchedule && <Loader2 className="animate-spin" aria-hidden />}
              Régénérer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog de suppression */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce bail ?</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer ce bail ? Ses échéances non payées
              seront également supprimées. Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              variant="destructive"
            >
              {isDeleting && <Loader2 className="animate-spin" aria-hidden />}
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog de renouvellement */}
      <Dialog open={renewDialogOpen} onOpenChange={setRenewDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Renouveler le bail</DialogTitle>
            <DialogDescription>
              Un nouveau bail est créé pour prolonger la location ; celui-ci passe en
              « Renouvelé ».
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="renewEndDate">Nouvelle date de fin</Label>
              <Input
                id="renewEndDate"
                type="date"
                value={renewEndDate}
                onChange={(e) => setRenewEndDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="renewRent">Nouveau loyer mensuel (FCFA)</Label>
              <Input
                id="renewRent"
                type="number"
                value={renewRent}
                onChange={(e) => setRenewRent(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRenewDialogOpen(false)}
              disabled={isRenewing}
            >
              Annuler
            </Button>
            <Button onClick={handleRenew} disabled={isRenewing}>
              {isRenewing && <Loader2 className="animate-spin" aria-hidden />}
              Renouveler
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de résiliation */}
      <Dialog open={terminateDialogOpen} onOpenChange={setTerminateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Résilier le bail</DialogTitle>
            <DialogDescription>
              Mettez fin au contrat de location à la date indiquée.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="terminationDate">Date de résiliation</Label>
              <Input
                id="terminationDate"
                type="date"
                value={terminationDate}
                onChange={(e) => setTerminationDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="terminationReason">Raison (optionnel)</Label>
              <Textarea
                id="terminationReason"
                value={terminationReason}
                onChange={(e) => setTerminationReason(e.target.value)}
                placeholder="Expliquez la raison de la résiliation…"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setTerminateDialogOpen(false)}
              disabled={isTerminating}
            >
              Annuler
            </Button>
            <Button
              onClick={handleTerminate}
              disabled={isTerminating}
              variant="destructive"
            >
              {isTerminating && <Loader2 className="animate-spin" aria-hidden />}
              Résilier
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
