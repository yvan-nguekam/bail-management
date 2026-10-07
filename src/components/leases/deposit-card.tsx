"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Loader2, PiggyBank, Plus, Trash2, Undo2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
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
import { formatCurrency } from "@/lib/utils";
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

const depositStatusLabels: Record<DepositStatus, string> = {
  NOT_RECEIVED: "Non reçue",
  HELD: "Détenue",
  SETTLED: "Restituée",
};

const depositStatusColors: Record<DepositStatus, "default" | "secondary" | "outline"> = {
  NOT_RECEIVED: "outline",
  HELD: "default",
  SETTLED: "secondary",
};

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
      <Card>
        <CardContent className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
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

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2">
          <PiggyBank className="h-5 w-5" />
          Caution
          <Badge variant={deposit.transferred ? "secondary" : depositStatusColors[status]}>
            {deposit.transferred ? "Reportée" : depositStatusLabels[status]}
          </Badge>
        </CardTitle>
        <div className="flex gap-2">
          {canReceive && (
            <Button variant="outline" size="sm" onClick={openReceiveDialog}>
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Marquer comme reçue
            </Button>
          )}
          {canSettle && (
            <Button size="sm" onClick={openSettleDialog}>
              <Undo2 className="mr-2 h-4 w-4" />
              Restituer la caution
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {deposit.transferred && (
          <p className="text-sm text-muted-foreground">
            Ce bail a été renouvelé : la caution est suivie sur le nouveau bail.
          </p>
        )}

        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <p className="text-sm text-muted-foreground">Montant prévu</p>
            <p className="font-semibold">{formatCurrency(deposit.securityDeposit)}</p>
          </div>
          {status !== "NOT_RECEIVED" && deposit.receivedAt && (
            <>
              <div>
                <p className="text-sm text-muted-foreground">Reçue le</p>
                <p className="font-semibold">
                  {formatDay(deposit.receivedAt)}
                  {deposit.receivedAmount !== null &&
                    ` · ${formatCurrency(deposit.receivedAmount)}`}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Mode de paiement</p>
                <p className="font-semibold">
                  {deposit.paymentMethod
                    ? paymentMethodLabels[deposit.paymentMethod] ?? deposit.paymentMethod
                    : "—"}
                  {deposit.reference && (
                    <span className="block text-xs font-normal text-muted-foreground">
                      Réf. {deposit.reference}
                    </span>
                  )}
                </p>
              </div>
            </>
          )}
        </div>

        {status === "NOT_RECEIVED" && !deposit.transferred && (
          <p className="text-sm text-muted-foreground">
            {deposit.securityDeposit > 0
              ? "La caution n'a pas encore été reçue."
              : "Aucune caution n'est prévue pour ce bail."}
          </p>
        )}

        {status !== "NOT_RECEIVED" && (
          <>
            <Separator />
            <div className="space-y-3">
              <h4 className="font-semibold">Retenues</h4>
              {deposit.deductions.length > 0 ? (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Libellé</TableHead>
                        <TableHead className="text-right">Montant</TableHead>
                        {canEditDeductions && <TableHead className="w-12" />}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {deposit.deductions.map((deduction) => (
                        <TableRow key={deduction.id}>
                          <TableCell>{deduction.label}</TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(deduction.amount)}
                          </TableCell>
                          {canEditDeductions && (
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="icon"
                                aria-label={`Supprimer la retenue ${deduction.label}`}
                                disabled={removingId === deduction.id}
                                onClick={() => handleRemoveDeduction(deduction.id)}
                              >
                                {removingId === deduction.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Trash2 className="h-4 w-4" />
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
                  className="grid gap-2 sm:grid-cols-[1fr_180px_auto] sm:items-end"
                >
                  <div className="space-y-1">
                    <Label htmlFor="deductionLabel">Libellé</Label>
                    <Input
                      id="deductionLabel"
                      value={deductionLabel}
                      onChange={(e) => setDeductionLabel(e.target.value)}
                      placeholder="Ex. Réparation porte"
                      maxLength={200}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="deductionAmount">Montant (FCFA)</Label>
                    <Input
                      id="deductionAmount"
                      type="number"
                      min={1}
                      step={1}
                      value={deductionAmount}
                      onChange={(e) => setDeductionAmount(e.target.value)}
                    />
                  </div>
                  <Button type="submit" variant="outline" disabled={isAddingDeduction}>
                    {isAddingDeduction ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Plus className="mr-2 h-4 w-4" />
                    )}
                    Ajouter
                  </Button>
                </form>
              )}
            </div>

            <Separator />

            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <p className="text-sm text-muted-foreground">Total des retenues</p>
                <p className="font-semibold">{formatCurrency(balance.totalDeductions)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  {isSettled ? "Montant restitué" : "Montant à restituer"}
                </p>
                <p className="font-semibold">
                  {formatCurrency(isSettled ? deposit.refundAmount ?? 0 : balance.refundAmount)}
                </p>
                {isSettled && deposit.settledAt && (
                  <p className="text-xs text-muted-foreground">
                    Le {formatDay(deposit.settledAt)}
                    {deposit.refundMethod &&
                      ` · ${paymentMethodLabels[deposit.refundMethod] ?? deposit.refundMethod}`}
                  </p>
                )}
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Reste dû par le locataire</p>
                <p
                  className={
                    balance.remainingDue > 0 ? "font-semibold text-destructive" : "font-semibold"
                  }
                >
                  {formatCurrency(balance.remainingDue)}
                </p>
              </div>
            </div>

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
            <div className="space-y-1">
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
            <div className="space-y-1">
              <Label htmlFor="depositReceivedAt">Date de réception</Label>
              <Input
                id="depositReceivedAt"
                type="date"
                value={receivedAt}
                onChange={(e) => setReceivedAt(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="depositMethod">Mode de paiement</Label>
              <PaymentMethodSelect
                id="depositMethod"
                value={receiveMethod}
                onChange={setReceiveMethod}
              />
            </div>
            <div className="space-y-1">
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
              {isReceiving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
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
            <div className="space-y-1 rounded-md border p-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Caution reçue</span>
                <span>{formatCurrency(balance.received)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Retenues</span>
                <span>− {formatCurrency(balance.totalDeductions)}</span>
              </div>
              <Separator className="my-2" />
              <div className="flex justify-between font-semibold">
                <span>À restituer</span>
                <span>{formatCurrency(balance.refundAmount)}</span>
              </div>
              {balance.remainingDue > 0 && (
                <div className="flex justify-between font-semibold text-destructive">
                  <span>Reste dû par le locataire</span>
                  <span>{formatCurrency(balance.remainingDue)}</span>
                </div>
              )}
            </div>
            <div className="space-y-1">
              <Label htmlFor="depositSettledAt">Date de restitution</Label>
              <Input
                id="depositSettledAt"
                type="date"
                value={settledAt}
                onChange={(e) => setSettledAt(e.target.value)}
              />
            </div>
            {balance.refundAmount > 0 && (
              <div className="space-y-1">
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
              {isSettling && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Restituer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
