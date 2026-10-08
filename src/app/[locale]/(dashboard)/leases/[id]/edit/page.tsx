"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { PageHeader } from "@/components/shared/page-header";
import { PageSkeleton } from "@/components/shared/page-skeleton";
import { statusLabel } from "@/components/shared/status-badge";
import { FormActions } from "@/components/properties/form-actions";
import { toast } from "sonner";

const leaseSchema = z.object({
  startDate: z.string().min(1, "La date de début est requise"),
  endDate: z.string().min(1, "La date de fin est requise"),
  monthlyRent: z.coerce.number().positive("Le loyer doit être positif"),
  securityDeposit: z.coerce.number().nonnegative("La caution doit être 0 ou plus"),
  paymentDay: z.coerce
    .number()
    .int()
    .min(1, "Entre 1 et 31")
    .max(31, "Entre 1 et 31"),
  status: z.enum(["DRAFT", "ACTIVE", "EXPIRED", "TERMINATED", "RENEWED"]),
  terms: z.string().optional(),
});

type LeaseFormData = z.infer<typeof leaseSchema>;

const leaseStatuses = ["DRAFT", "ACTIVE", "EXPIRED", "TERMINATED", "RENEWED"] as const;

export default function EditLeasePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [propertyName, setPropertyName] = useState("");
  const [tenantName, setTenantName] = useState("");

  const form = useForm<z.input<typeof leaseSchema>, unknown, LeaseFormData>({
    resolver: zodResolver(leaseSchema),
  });

  useEffect(() => {
    fetchLease();
  }, [params.id]);

  const fetchLease = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/leases/${params.id}`);

      if (!response.ok) {
        throw new Error("Bail non trouvé");
      }

      const lease = await response.json();
      setPropertyName(lease.property.name);
      setTenantName(lease.tenant.name);

      // Formater les dates pour l'input date
      const startDate = new Date(lease.startDate).toISOString().split("T")[0];
      const endDate = new Date(lease.endDate).toISOString().split("T")[0];

      form.reset({
        startDate,
        endDate,
        monthlyRent: lease.monthlyRent,
        securityDeposit: lease.securityDeposit,
        paymentDay: lease.paymentDay,
        status: lease.status,
        terms: lease.terms || "",
      });
    } catch (error) {
      console.error("Erreur:", error);
      toast.error("Erreur lors du chargement du bail");
      router.push("/leases");
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = async (data: LeaseFormData) => {
    setIsSubmitting(true);
    try {
      const formattedData = {
        ...data,
        startDate: new Date(data.startDate).toISOString(),
        endDate: new Date(data.endDate).toISOString(),
      };

      const response = await fetch(`/api/leases/${params.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formattedData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erreur lors de la mise à jour");
      }

      toast.success("Bail mis à jour avec succès");
      router.push(`/leases/${params.id}`);
    } catch (error) {
      console.error("Erreur:", error);
      toast.error(
        error instanceof Error ? error.message : "Erreur lors de la mise à jour"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <PageSkeleton stats={0} />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Modifier le bail"
        description={`${propertyName} · ${tenantName}`}
        backHref={`/leases/${params.id}`}
      />

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Période du bail */}
          <Card className="animate-fade-up" style={{ "--stagger": 1 } as React.CSSProperties}>
            <CardHeader>
              <CardTitle>Période et statut</CardTitle>
              <CardDescription>La date de fin est incluse dans la location.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <FormField
                  control={form.control}
                  name="startDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date de début</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="endDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date de fin</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Statut</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Sélectionner un statut" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {leaseStatuses.map((value) => (
                            <SelectItem key={value} value={value}>
                              {statusLabel("lease", value)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Informations financières */}
          <Card className="animate-fade-up" style={{ "--stagger": 2 } as React.CSSProperties}>
            <CardHeader>
              <CardTitle>Informations financières</CardTitle>
              <CardDescription>
                Modifier les dates, le loyer ou le jour de paiement recalcule les échéances non
                payées. Les échéances déjà payées ou annulées ne sont pas modifiées.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <FormField
                  control={form.control}
                  name="monthlyRent"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Loyer mensuel (FCFA)</FormLabel>
                      <FormControl>
                        <Input type="number" min="0" {...field} value={field.value as number} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="securityDeposit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Caution (FCFA)</FormLabel>
                      <FormControl>
                        <Input type="number" min="0" {...field} value={field.value as number} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="paymentDay"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Jour de paiement</FormLabel>
                      <FormControl>
                        <Input type="number" min="1" max="31" {...field} value={field.value as number} />
                      </FormControl>
                      <FormDescription>Jour du mois où le loyer est dû</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Conditions du bail */}
          <Card className="animate-fade-up" style={{ "--stagger": 3 } as React.CSSProperties}>
            <CardHeader>
              <CardTitle>Conditions du bail</CardTitle>
              <CardDescription>Clauses particulières reprises dans le contrat.</CardDescription>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="terms"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Termes et conditions</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Décrivez les conditions du bail…"
                        className="min-h-[150px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <FormActions
            submitLabel="Enregistrer les modifications"
            isSubmitting={isSubmitting}
            onCancel={() => router.back()}
          />
        </form>
      </Form>
    </div>
  );
}
