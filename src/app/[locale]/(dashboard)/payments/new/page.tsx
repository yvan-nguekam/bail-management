"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Loader2, Building2, User, Banknote } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { PageSkeleton } from "@/components/shared/page-skeleton";
import { formatCurrency } from "@/lib/utils";
import { PAYMENT_METHOD_LABELS } from "@/components/payments/payment-helpers";

const paymentSchema = z.object({
  leaseId: z.string().min(1, "Le bail est requis"),
  amount: z.coerce.number().positive("Le montant doit être positif"),
  dueDate: z.string().min(1, "La date d'échéance est requise"),
  paymentMethod: z.enum(["CASH", "BANK_TRANSFER", "CREDIT_CARD", "CHECK", "MOBILE_MONEY"]).optional(),
  notes: z.string().optional(),
});

type PaymentFormData = z.infer<typeof paymentSchema>;

interface Lease {
  id: string;
  monthlyRent: number;
  property: {
    name: string;
    address: string;
    city: string;
  };
  tenant: {
    name: string;
    email: string;
  };
}

export default function NewPaymentPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedLeaseId = searchParams.get("leaseId");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [leases, setLeases] = useState<Lease[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  const form = useForm<z.input<typeof paymentSchema>, unknown, PaymentFormData>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      leaseId: preselectedLeaseId || "",
      amount: 0,
      dueDate: new Date().toISOString().split("T")[0],
      notes: "",
    },
  });

  useEffect(() => {
    fetchLeases();
  }, []);

  const fetchLeases = async () => {
    setLoadingData(true);
    try {
      const response = await fetch("/api/leases?limit=100&status=ACTIVE");

      if (response.ok) {
        const data = await response.json();
        setLeases(data.leases);
      }
    } catch (error) {
      console.error("Erreur:", error);
      toast.error("Erreur lors du chargement des baux");
    } finally {
      setLoadingData(false);
    }
  };

  const handleLeaseChange = (leaseId: string) => {
    const lease = leases.find((l) => l.id === leaseId);
    if (lease) {
      form.setValue("amount", lease.monthlyRent);
    }
  };

  const onSubmit = async (data: PaymentFormData) => {
    setIsSubmitting(true);
    try {
      const formattedData = {
        ...data,
        dueDate: new Date(data.dueDate).toISOString(),
      };

      const response = await fetch("/api/payments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formattedData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erreur lors de la création");
      }

      const payment = await response.json();
      toast.success("Paiement enregistré avec succès");
      router.push(`/payments/${payment.id}`);
    } catch (error) {
      console.error("Erreur:", error);
      toast.error(
        error instanceof Error ? error.message : "Erreur lors de la création"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedLeaseId = form.watch("leaseId");
  const selectedLease = leases.find((l) => l.id === selectedLeaseId);

  if (loadingData) {
    return <PageSkeleton stats={0} />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Nouveau paiement"
        description="Enregistrez une échéance de loyer pour un bail actif"
        backHref="/payments"
      />

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="max-w-3xl space-y-6">
          {/* Sélection du bail */}
          <Card className="animate-fade-up" style={{ "--stagger": 1 } as React.CSSProperties}>
            <CardHeader>
              <CardTitle>Bail concerné</CardTitle>
              <CardDescription>
                Le montant est pré-rempli avec le loyer mensuel du bail choisi.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="leaseId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bail</FormLabel>
                    <Select
                      onValueChange={(value) => {
                        field.onChange(value);
                        handleLeaseChange(value);
                      }}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Sélectionner un bail actif" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {leases.length === 0 ? (
                          <div className="p-2 text-sm text-muted-foreground">
                            Aucun bail actif disponible
                          </div>
                        ) : (
                          leases.map((lease) => (
                            <SelectItem key={lease.id} value={lease.id}>
                              <span className="font-medium">{lease.property.name}</span>
                              <span className="text-muted-foreground">
                                · {lease.tenant.name} · {formatCurrency(lease.monthlyRent)}/mois
                              </span>
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Sélectionnez le bail pour lequel créer le paiement
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {selectedLease && (
                <div className="animate-fade-in grid gap-4 rounded-lg border bg-muted/40 p-4 sm:grid-cols-3">
                  <div className="flex items-start gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Building2 className="h-4 w-4" aria-hidden />
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">Bien</p>
                      <p className="truncate text-sm font-medium">{selectedLease.property.name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {selectedLease.property.city}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <User className="h-4 w-4" aria-hidden />
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">Locataire</p>
                      <p className="truncate text-sm font-medium">{selectedLease.tenant.name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {selectedLease.tenant.email}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Banknote className="h-4 w-4" aria-hidden />
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">Loyer mensuel</p>
                      <p className="text-sm font-medium tabular-nums">
                        {formatCurrency(selectedLease.monthlyRent)}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Informations du paiement */}
          <Card className="animate-fade-up" style={{ "--stagger": 2 } as React.CSSProperties}>
            <CardHeader>
              <CardTitle>Détails du paiement</CardTitle>
              <CardDescription>Montant, échéance et informations complémentaires.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Montant (FCFA)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          className="tabular-nums"
                          {...field}
                          value={field.value as number}
                        />
                      </FormControl>
                      <FormDescription>
                        Rempli automatiquement depuis le bail
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="dueDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date d&apos;échéance</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="paymentMethod"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Méthode de paiement (optionnel)</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Sélectionner une méthode" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(PAYMENT_METHOD_LABELS).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Vous pourrez le modifier plus tard
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes (optionnel)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Ajouter des notes sur ce paiement..."
                        className="min-h-[100px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <div
            className="animate-fade-up flex flex-col-reverse gap-3 border-t pt-6 sm:flex-row sm:justify-end"
            style={{ "--stagger": 3 } as React.CSSProperties}
          >
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              disabled={isSubmitting}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              )}
              Enregistrer le paiement
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
