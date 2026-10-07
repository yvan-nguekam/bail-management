"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Loader2, PiggyBank, Plus, Trash2, Undo2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
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
import { Skeleton } from "@/components/ui/skeleton";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusBadge } from "@/components/shared/status-badge";
import { formatCurrency, cn } from "@/lib/utils";
import { computeDepositBalance } from "@/lib/deposit";

type DepositStatus = "NOT_RECEIVED" | "HELD" | "SETTLED";

interface DepositSummary {
  leaseStatus: string;
  securityDeposit: number;
  status: DepositStatus;
  receivedAmount: number | null;
  receivedAt: string | null;
  paymentMethod: string | null;
  reference: string | null;
  settledAt: string | null;
  refundAmount: number | null;
  refundMethod: string | null;
  deductions: Array<{
    id: string;
    label: string;
    amount: number;
    createdAt: string;
    createdBy: { id: string; name: string } | null;
  }>;
  balance: {
    received: number;
    totalDeductions: number;
    refundAmount: number;
    remainingDue: number;
  };
  transferred: boolean;
  canManage: boolean;
}

const paymentMethodLabels: Record<string, string> = {
  CASH: "Espèces",
  BANK_TRANSFER: "Virement bancaire",
  CREDIT_CARD: "Carte bancaire",
  CHECK: "Chèque",
  MOBILE_MONEY: "Mobile Money",
};

// Dates stockées à minuit UTC
const formatDay = (value: string) =>
  new Date(value).toLocaleDateString("fr-FR", { timeZone: "UTC" });

const today = () => new Date().toISOString().split("T")[0];

async function readError(response: Response, fallback: string) {
  try {
    const data = await response.json();
    return data.error || fallback;
  } catch {
    return fallback;
  }
}

function PaymentMethodSelect({
  id,
  value,
  onChange,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger id={id} className="w-full">
        <SelectValue placeholder="Choisir un mode" />
      </SelectTrigger>
      <SelectContent>
        {Object.entries(paymentMethodLabels).map(([method, label]) => (
          <SelectItem key={method} value={method}>
            {label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/** Donnée clé de la caution : libellé discret, valeur en évidence. */
function Figure({
  label,
  value,
  hint,
  className,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  className?: string;
}) {
  return (
    <div>
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className={cn("font-semibold tabular-nums", className)}>{value}</dd>
      {hint && <dd className="text-xs text-muted-foreground">{hint}</dd>}
    </div>
  );
}

interface DepositCardProps {
  leaseId: string;
  /** Statut du bail : la caution est rechargée quand il change (résiliation...) */
  leaseStatus: string;
}

export function DepositCard({ leaseId, leaseStatus }: DepositCardProps) {
  const [deposit, setDeposit] = useState<DepositSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const [receiveOpen, setReceiveOpen] = useState(false);
  const [receivedAt, setReceivedAt] = useState(today);
  const [receiveMethod, setReceiveMethod] = useState("");
  const [receiveReference, setReceiveReference] = useState("");
  const [receiveAmount, setReceiveAmount] = useState("");
  const [isReceiving, setIsReceiving] = useState(false);

  const [deductionLabel, setDeductionLabel] = useState("");
  const [deductionAmount, setDeductionAmount] = useState("");
  const [isAddingDeduction, setIsAddingDeduction] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const [settleOpen, setSettleOpen] = useState(false);
  const [settledAt, setSettledAt] = useState(today);
  const [refundMethod, setRefundMethod] = useState("");
  const [isSettling, setIsSettling] = useState(false);

  const fetchDeposit = useCallback(async () => {
    try {
      const response = await fetch(`/api/leases/${leaseId}/deposit`);
      if (!response.ok) {
        throw new Error(await readError(response, "Erreur lors du chargement de la caution"));
      }
      setDeposit(await response.json());
    } catch (error) {
      console.error("Erreur:", error);
      toast.error(
        error instanceof Error ? error.message : "Erreur lors du chargement de la caution"
      );
    } finally {
      setLoading(false);
    }
  }, [leaseId]);

  useEffect(() => {
    fetchDeposit();
  }, [fetchDeposit, leaseStatus]);

  const openReceiveDialog = () => {
    if (!deposit) return;
    setReceivedAt(today());
    setReceiveMethod("");
    setReceiveReference("");
    setReceiveAmount(String(Math.round(deposit.securityDeposit)));
    setReceiveOpen(true);
  };

  const openSettleDialog = () => {
    setSettledAt(today());
    setRefundMethod(deposit?.paymentMethod ?? "");
    setSettleOpen(true);
  };

  const handleReceive = async () => {
    const amount = Number(receiveAmount);
    if (!receivedAt || !receiveMethod) {
      toast.error("Veuillez indiquer la date et le mode de paiement");
      return;
    }
    if (!Number.isInteger(amount) || amount <= 0) {
      toast.error("Le montant doit être un nombre entier positif");
      return;
    }

    setIsReceiving(true);
    try {
      const response = await fetch(`/api/leases/${leaseId}/deposit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "receive",
          receivedAt: new Date(receivedAt).toISOString(),
          paymentMethod: receiveMethod,
          reference: receiveReference.trim() || undefined,
          amount,
        }),
      });
      if (!response.ok) {
        throw new Error(await readError(response, "Erreur lors de l'enregistrement"));
      }
      setDeposit(await response.json());
      setReceiveOpen(false);
      toast.success("Caution marquée comme reçue");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur lors de l'enregistrement");
    } finally {
      setIsReceiving(false);
    }
  };

  const handleAddDeduction = async (event: FormEvent) => {
    event.preventDefault();
    const amount = Number(deductionAmount);
    if (!deductionLabel.trim()) {
      toast.error("Veuillez saisir un libellé");
      return;
    }
    if (!Number.isInteger(amount) || amount <= 0) {
      toast.error("Le montant doit être un nombre entier positif");
      return;
    }

    setIsAddingDeduction(true);
    try {
      const response = await fetch(`/api/leases/${leaseId}/deposit/deductions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: deductionLabel.trim(), amount }),
      });
      if (!response.ok) {
        throw new Error(await readError(response, "Erreur lors de l'ajout de la retenue"));
      }
      setDeposit(await response.json());
      setDeductionLabel("");
      setDeductionAmount("");
      toast.success("Retenue ajoutée");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur lors de l'ajout de la retenue");
    } finally {
      setIsAddingDeduction(false);
    }
  };

  const handleRemoveDeduction = async (deductionId: string) => {
    setRemovingId(deductionId);
    try {
      const response = await fetch(
        `/api/leases/${leaseId}/deposit/deductions/${deductionId}`,
        { method: "DELETE" }
      );
      if (!response.ok) {
        throw new Error(await readError(response, "Erreur lors de la suppression"));
      }
      setDeposit(await response.json());
      toast.success("Retenue supprimée");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur lors de la suppression");
    } finally {
      setRemovingId(null);
    }
  };

  const handleSettle = async () => {
    if (!deposit) return;
    if (!settledAt) {
      toast.error("Veuillez indiquer la date de restitution");
      return;
    }
    const needsMethod = deposit.balance.refundAmount > 0;
    if (needsMethod && !refundMethod) {
      toast.error("Veuillez indiquer le mode de restitution");
      return;
    }

    setIsSettling(true);
    try {
      const response = await fetch(`/api/leases/${leaseId}/deposit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "settle",
          settledAt: new Date(settledAt).toISOString(),
          refundMethod: needsMethod ? refundMethod : undefined,
        }),
      });
      if (!response.ok) {
        throw new Error(await readError(response, "Erreur lors de la restitution"));
      }
      setDeposit(await response.json());
      setSettleOpen(false);
      toast.success("Caution restituée");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur lors de la restitution");
    } finally {
      setIsSettling(false);
    }
  };

  if (loading) {
    return (
      <Card className="animate-fade-up" aria-busy="true">
        <CardHeader>
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-64 max-w-full" />
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            <Skeleton className="h-12" />
            <Skeleton className="h-12" />
            <Skeleton className="h-12" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!deposit) {
    return null;
  }

  const { status, balance } = deposit;
  const editable = deposit.canManage && !deposit.transferred;
  const isHeld = status === "HELD";
  const isSettled = status === "SETTLED";
  const canReceive = editable && status === "NOT_RECEIVED" && deposit.securityDeposit > 0;
  const canEditDeductions = editable && isHeld;
  const canSettle =
    editable && isHeld && ["TERMINATED", "EXPIRED"].includes(deposit.leaseStatus);

  // Aperçu du montant saisi avant ajout
  const pendingAmount = Number(deductionAmount);
  const preview =
    canEditDeductions && Number.isFinite(pendingAmount) && pendingAmount > 0
      ? computeDepositBalance(
          balance.received,
          [...deposit.deductions.map((d) => d.amount), pendingAmount]
        )
      : null;

  const description = deposit.transferred
    ? "Ce bail a été renouvelé : la caution est suivie sur le nouveau bail."
    : status === "NOT_RECEIVED"
      ? deposit.securityDeposit > 0
        ? "La caution n'a pas encore été reçue."
        : "Aucune caution n'est prévue pour ce bail."
      : isSettled
        ? "La caution a été restituée ; elle n'est plus modifiable."
        : "Dépôt de garantie détenu pendant la durée du bail.";

  return (
    <Card className="animate-fade-up" style={{ "--stagger": 5 } as React.CSSProperties}>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2">
          <PiggyBank className="h-5 w-5 text-muted-foreground" aria-hidden />
          Caution
          {deposit.transferred ? (
            <Badge variant="muted">Reportée</Badge>
          ) : (
            <StatusBadge kind="deposit" status={status} />
          )}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
        {(canReceive || canSettle) && (
          <CardAction className="flex flex-wrap gap-2">
            {canReceive && (
              <Button variant="outline" size="sm" onClick={openReceiveDialog}>
                <CheckCircle2 aria-hidden />
                Marquer comme reçue
              </Button>
            )}
            {canSettle && (
              <Button size="sm" onClick={openSettleDialog}>
                <Undo2 aria-hidden />
                Restituer la caution
              </Button>
            )}
          </CardAction>
        )}
      </CardHeader>
      <CardContent className="space-y-5">
        <dl className="grid gap-4 sm:grid-cols-3">
          <Figure label="Montant prévu" value={formatCurrency(deposit.securityDeposit)} />
          {status !== "NOT_RECEIVED" && deposit.receivedAt && (
            <>
              <Figure
                label="Reçue le"
                value={formatDay(deposit.receivedAt)}
                hint={
                  deposit.receivedAmount !== null && formatCurrency(deposit.receivedAmount)
                }
              />
              <Figure
                label="Mode de paiement"
                value={
                  deposit.paymentMethod
                    ? paymentMethodLabels[deposit.paymentMethod] ?? deposit.paymentMethod
                    : "—"
                }
                hint={deposit.reference && `Réf. ${deposit.reference}`}
              />
            </>
          )}
        </dl>

        {status !== "NOT_RECEIVED" && (
          <>
            <Separator />
            <div className="space-y-3">
              <h4 className="text-sm font-semibold">Retenues</h4>
              {deposit.deductions.length > 0 ? (
                <div className="overflow-hidden rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/40 hover:bg-muted/40">
                        <TableHead className="pl-4">Libellé</TableHead>
                        <TableHead className={cn("text-right", !canEditDeductions && "pr-4")}>
                          Montant
                        </TableHead>
                        {canEditDeductions && (
                          <TableHead className="w-14 pr-2">
                            <span className="sr-only">Actions</span>
                          </TableHead>
                        )}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {deposit.deductions.map((deduction) => (
                        <TableRow key={deduction.id}>
                          <TableCell className="pl-4">{deduction.label}</TableCell>
                          <TableCell
                            className={cn("text-right tabular-nums", !canEditDeductions && "pr-4")}
                          >
                            {formatCurrency(deduction.amount)}
                          </TableCell>
                          {canEditDeductions && (
                            <TableCell className="pr-2 text-right">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-muted-foreground hover:text-destructive"
                                aria-label={`Supprimer la retenue ${deduction.label}`}
                                disabled={removingId === deduction.id}
                                onClick={() => handleRemoveDeduction(deduction.id)}
                              >
                                {removingId === deduction.id ? (
                                  <Loader2 className="animate-spin" aria-hidden />
                                ) : (
                                  <Trash2 />
                                )}
                              </Button>
                            </TableCell>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Aucune retenue.</p>
              )}

              {canEditDeductions && (
                <form
                  onSubmit={handleAddDeduction}
                  className="grid gap-3 rounded-lg border bg-muted/30 p-4 sm:grid-cols-[1fr_180px_auto] sm:items-end"
                >
                  <div className="space-y-2">
                    <Label htmlFor="deductionLabel">Libellé</Label>
                    <Input
                      id="deductionLabel"
                      className="bg-background"
                      value={deductionLabel}
                      onChange={(e) => setDeductionLabel(e.target.value)}
                      placeholder="Ex. Réparation porte"
                      maxLength={200}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="deductionAmount">Montant (FCFA)</Label>
                    <Input
                      id="deductionAmount"
                      type="number"
                      className="bg-background"
                      min={1}
                      step={1}
                      value={deductionAmount}
                      onChange={(e) => setDeductionAmount(e.target.value)}
                    />
                  </div>
                  <Button type="submit" variant="outline" disabled={isAddingDeduction}>
                    {isAddingDeduction ? (
                      <Loader2 className="animate-spin" aria-hidden />
                    ) : (
                      <Plus aria-hidden />
                    )}
                    Ajouter
                  </Button>
                </form>
              )}
            </div>

            <Separator />

            <dl className="grid gap-4 sm:grid-cols-3">
              <Figure label="Total des retenues" value={formatCurrency(balance.totalDeductions)} />
              <Figure
                label={isSettled ? "Montant restitué" : "Montant à restituer"}
                value={formatCurrency(isSettled ? deposit.refundAmount ?? 0 : balance.refundAmount)}
                className={isSettled ? "text-success" : undefined}
                hint={
                  isSettled &&
                  deposit.settledAt && (
                    <>
                      Le {formatDay(deposit.settledAt)}
                      {deposit.refundMethod &&
                        ` · ${paymentMethodLabels[deposit.refundMethod] ?? deposit.refundMethod}`}
                    </>
                  )
                }
              />
              <Figure
                label="Reste dû par le locataire"
                value={formatCurrency(balance.remainingDue)}
                className={balance.remainingDue > 0 ? "text-destructive" : undefined}
              />
            </dl>

            {preview && (
              <p className="text-xs text-muted-foreground">
                Après ajout : {formatCurrency(preview.refundAmount)} à restituer
                {preview.remainingDue > 0 &&
                  `, ${formatCurrency(preview.remainingDue)} restant dus par le locataire`}
                .
              </p>
            )}

            {editable && isHeld && !canSettle && (
              <p className="text-xs text-muted-foreground">
                La caution pourra être restituée une fois le bail résilié ou expiré.
              </p>
            )}
          </>
        )}
      </CardContent>

      {/* Dialog de réception */}
      <Dialog open={receiveOpen} onOpenChange={setReceiveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Marquer la caution comme reçue</DialogTitle>
            <DialogDescription>
              Enregistrez l&apos;encaissement du dépôt de garantie.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="depositAmount">Montant reçu (FCFA)</Label>
              <Input
                id="depositAmount"
                type="number"
                min={1}
                step={1}
                value={receiveAmount}
                onChange={(e) => setReceiveAmount(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="depositReceivedAt">Date de réception</Label>
              <Input
                id="depositReceivedAt"
                type="date"
                value={receivedAt}
                onChange={(e) => setReceivedAt(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="depositMethod">Mode de paiement</Label>
              <PaymentMethodSelect
                id="depositMethod"
                value={receiveMethod}
                onChange={setReceiveMethod}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="depositReference">Référence (optionnel)</Label>
              <Input
                id="depositReference"
                value={receiveReference}
                onChange={(e) => setReceiveReference(e.target.value)}
                maxLength={200}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setReceiveOpen(false)}
              disabled={isReceiving}
            >
              Annuler
            </Button>
            <Button onClick={handleReceive} disabled={isReceiving}>
              {isReceiving && <Loader2 className="animate-spin" aria-hidden />}
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de restitution */}
      <Dialog open={settleOpen} onOpenChange={setSettleOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Restituer la caution</DialogTitle>
            <DialogDescription>
              Une fois restituée, la caution et ses retenues ne pourront plus être modifiées.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <dl className="space-y-1.5 rounded-lg border bg-muted/30 p-3 text-sm tabular-nums">
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Caution reçue</dt>
                <dd>{formatCurrency(balance.received)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Retenues</dt>
                <dd>− {formatCurrency(balance.totalDeductions)}</dd>
              </div>
              <Separator className="my-2" />
              <div className="flex justify-between gap-4 font-semibold">
                <dt>À restituer</dt>
                <dd>{formatCurrency(balance.refundAmount)}</dd>
              </div>
              {balance.remainingDue > 0 && (
                <div className="flex justify-between gap-4 font-semibold text-destructive">
                  <dt>Reste dû par le locataire</dt>
                  <dd>{formatCurrency(balance.remainingDue)}</dd>
                </div>
              )}
            </dl>
            <div className="space-y-2">
              <Label htmlFor="depositSettledAt">Date de restitution</Label>
              <Input
                id="depositSettledAt"
                type="date"
                value={settledAt}
                onChange={(e) => setSettledAt(e.target.value)}
              />
            </div>
            {balance.refundAmount > 0 && (
              <div className="space-y-2">
                <Label htmlFor="refundMethod">Mode de restitution</Label>
                <PaymentMethodSelect
                  id="refundMethod"
                  value={refundMethod}
                  onChange={setRefundMethod}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setSettleOpen(false)}
              disabled={isSettling}
            >
              Annuler
            </Button>
            <Button onClick={handleSettle} disabled={isSettling}>
              {isSettling && <Loader2 className="animate-spin" aria-hidden />}
              Restituer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
