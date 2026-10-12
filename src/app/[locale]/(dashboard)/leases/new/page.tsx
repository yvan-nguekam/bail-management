"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { PageHeader } from "@/components/shared/page-header";
import { PageSkeleton } from "@/components/shared/page-skeleton";
import { FormActions } from "@/components/properties/form-actions";
import { PaymentScheduleTable } from "@/components/leases/payment-schedule-table";
import { AddTenantDialog, type FoundTenant } from "@/components/leases/add-tenant-dialog";
import { Button } from "@/components/ui/button";
import { UserPlus } from "lucide-react";
import { generatePaymentSchedule, scheduleTotal } from "@/lib/payment-schedule";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";

const leaseSchema = z.object({
  propertyId: z.string().min(1, "La propriété est requise"),
  tenantId: z.string().min(1, "Le locataire est requis"),
  startDate: z.string().min(1, "La date de début est requise"),
  endDate: z.string().min(1, "La date de fin est requise"),
  monthlyRent: z.coerce.number().positive("Le loyer doit être positif"),
  securityDeposit: z.coerce.number().nonnegative("La caution doit être 0 ou plus"),
  paymentDay: z.coerce
    .number()
    .int()
    .min(1, "Entre 1 et 31")
    .max(31, "Entre 1 et 31"),
  generateSchedule: z.boolean(),
  terms: z.string().optional(),
});

type LeaseFormData = z.infer<typeof leaseSchema>;

interface Property {
  id: string;
  name: string;
  address: string;
  city: string;
  monthlyRent: number;
  securityDeposit: number;
}

interface TenantOption {
  id: string;
  name: string;
  /** Absent pour un locataire retrouvé par e-mail exact (seuls id et nom sont renvoyés) */
  email?: string;
}

interface PendingInvitation {
  id: string;
  email: string;
  name: string;
}

export default function NewLeasePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedPropertyId = searchParams.get("propertyId");
  const preselectedTenantId = searchParams.get("tenantId");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [properties, setProperties] = useState<Property[]>([]);
  const [tenants, setTenants] = useState<TenantOption[]>([]);
  const [pendingInvitations, setPendingInvitations] = useState<PendingInvitation[]>([]);
  const [addTenantOpen, setAddTenantOpen] = useState(false);
  const [loadingData, setLoadingData] = useState(true);

  const form = useForm<z.input<typeof leaseSchema>, unknown, LeaseFormData>({
    resolver: zodResolver(leaseSchema),
    defaultValues: {
      propertyId: preselectedPropertyId || "",
      tenantId: preselectedTenantId || "",
      startDate: new Date().toISOString().split("T")[0],
      endDate: "",
      monthlyRent: 0,
      securityDeposit: 0,
      paymentDay: 1,
      generateSchedule: true,
      terms: "",
    },
  });

  const [startDate, endDate, monthlyRent, paymentDay, generateSchedule] = form.watch([
    "startDate",
    "endDate",
    "monthlyRent",
    "paymentDay",
    "generateSchedule",
  ]);

  // Aperçu calculé avec la même règle que le serveur
  const schedulePreview = useMemo(
    () =>
      startDate && endDate
        ? generatePaymentSchedule({
            startDate: new Date(startDate),
            endDate: new Date(endDate),
            monthlyRent: Number(monthlyRent),
            paymentDay: Number(paymentDay),
          })
        : [],
    [startDate, endDate, monthlyRent, paymentDay]
  );

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoadingData(true);
    try {
      const [propertiesRes, tenantsRes] = await Promise.all([
        fetch("/api/properties?limit=100&status=AVAILABLE"),
        // Uniquement « mes » locataires : jamais l'annuaire complet de la plateforme
        fetch("/api/tenants/options"),
      ]);

      if (propertiesRes.ok) {
        const data = await propertiesRes.json();
        setProperties(data.properties);
      }

      if (tenantsRes.ok) {
        const data = await tenantsRes.json();
        setTenants(data.tenants);
        setPendingInvitations(data.pendingInvitations);
      }
    } catch (error) {
      console.error("Erreur:", error);
      toast.error("Erreur lors du chargement des données");
    } finally {
      setLoadingData(false);
    }
  };

  const refreshPendingInvitations = async () => {
    try {
      const response = await fetch("/api/tenants/options");
      if (response.ok) {
        const data = await response.json();
        setPendingInvitations(data.pendingInvitations);
      }
    } catch {
      // Liste indicative : sans effet sur le formulaire
    }
  };

  const handleTenantFound = (tenant: FoundTenant) => {
    setTenants((current) =>
      current.some((t) => t.id === tenant.id)
        ? current
        : [...current, tenant].sort((a, b) => a.name.localeCompare(b.name, "fr"))
    );
    form.setValue("tenantId", tenant.id, { shouldValidate: true });
  };

  const handlePropertyChange = (propertyId: string) => {
    const property = properties.find((p) => p.id === propertyId);
    if (property) {
      form.setValue("monthlyRent", property.monthlyRent);
      form.setValue("securityDeposit", property.securityDeposit);
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

      const response = await fetch("/api/leases", {
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

      const lease = await response.json();
      toast.success("Bail créé avec succès");
      router.push(`/leases/${lease.id}`);
    } catch (error) {
      console.error("Erreur:", error);
      toast.error(
        error instanceof Error ? error.message : "Erreur lors de la création"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loadingData) {
    return <PageSkeleton stats={0} />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Nouveau bail"
        description="Créez un contrat de location entre un bien et un locataire."
        backHref="/leases"
      />

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Sélection propriété et locataire */}
          <Card className="animate-fade-up" style={{ "--stagger": 1 } as React.CSSProperties}>
            <CardHeader>
              <CardTitle>Bien et locataire</CardTitle>
              <CardDescription>
                Seuls les biens disponibles sont proposés. Le loyer et la caution sont
                préremplis depuis le bien.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid items-start gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="propertyId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bien</FormLabel>
                      <Select
                        onValueChange={(value) => {
                          field.onChange(value);
                          handlePropertyChange(value);
                        }}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Sélectionner un bien" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {properties.length === 0 ? (
                            <div className="p-2 text-sm text-muted-foreground">
                              Aucun bien disponible
                            </div>
                          ) : (
                            properties.map((property) => (
                              <SelectItem key={property.id} value={property.id}>
                                <span className="font-medium">{property.name}</span>
                                <span className="truncate text-xs text-muted-foreground">
                                  {property.address}, {property.city}
                                </span>
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="tenantId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Locataire</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Sélectionner un locataire" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {tenants.length === 0 ? (
                            <div className="p-2 text-sm text-muted-foreground">
                              Aucun locataire pour l&apos;instant
                            </div>
                          ) : (
                            tenants.map((tenant) => (
                              <SelectItem key={tenant.id} value={tenant.id}>
                                <span className="font-medium">{tenant.name}</span>
                                {tenant.email && (
                                  <span className="truncate text-xs text-muted-foreground">
                                    {tenant.email}
                                  </span>
                                )}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Vos locataires actuels et passés. Nouveau locataire ?{" "}
                        <Button
                          type="button"
                          variant="link"
                          className="h-auto p-0 align-baseline"
                          onClick={() => setAddTenantOpen(true)}
                        >
                          <UserPlus className="h-3.5 w-3.5" aria-hidden />
                          Trouver par e-mail ou inviter
                        </Button>
                      </FormDescription>
                      {pendingInvitations.length > 0 && (
                        <p className="text-xs text-muted-foreground">
                          En attente d&apos;inscription :{" "}
                          {pendingInvitations.map((i) => i.name).join(", ")}
                        </p>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Période du bail */}
          <Card className="animate-fade-up" style={{ "--stagger": 2 } as React.CSSProperties}>
            <CardHeader>
              <CardTitle>Période du bail</CardTitle>
              <CardDescription>La date de fin est incluse dans la location.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
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
              </div>
            </CardContent>
          </Card>

          {/* Informations financières */}
          <Card className="animate-fade-up" style={{ "--stagger": 3 } as React.CSSProperties}>
            <CardHeader>
              <CardTitle>Informations financières</CardTitle>
              <CardDescription>Loyer, dépôt de garantie et jour d&apos;exigibilité.</CardDescription>
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
                      <FormDescription>
                        Prérempli depuis le bien
                      </FormDescription>
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
                      <FormDescription>
                        Préremplie depuis le bien
                      </FormDescription>
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
                      <FormDescription>
                        Jour du mois où le loyer est dû
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Échéancier des loyers */}
          <Card className="animate-fade-up" style={{ "--stagger": 4 } as React.CSSProperties}>
            <CardHeader>
              <CardTitle>Échéancier des loyers</CardTitle>
              <CardDescription>
                Aperçu des échéances qui seront créées avec le bail.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="generateSchedule"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start gap-3 space-y-0 rounded-lg border bg-muted/30 p-4">
                    <FormControl>
                      <input
                        type="checkbox"
                        className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded border-input accent-primary"
                        checked={field.value}
                        onChange={(event) => field.onChange(event.target.checked)}
                        onBlur={field.onBlur}
                        name={field.name}
                        ref={field.ref}
                      />
                    </FormControl>
                    <div className="space-y-1">
                      <FormLabel className="cursor-pointer">
                        Générer automatiquement les échéances
                      </FormLabel>
                      <FormDescription>
                        Une échéance par mois, du début à la fin du bail. Le premier et le
                        dernier mois incomplets sont calculés au prorata.
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />

              {generateSchedule &&
                (schedulePreview.length > 0 ? (
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 text-sm">
                      <p className="text-muted-foreground">
                        <span className="font-medium text-foreground tabular-nums">
                          {schedulePreview.length}
                        </span>{" "}
                        échéance{schedulePreview.length > 1 ? "s" : ""}
                      </p>
                      <p className="text-muted-foreground">
                        Total{" "}
                        <span className="font-semibold text-foreground tabular-nums">
                          {formatCurrency(scheduleTotal(schedulePreview))}
                        </span>
                      </p>
                    </div>
                    <div className="max-h-72 overflow-y-auto rounded-lg border">
                      <PaymentScheduleTable rows={schedulePreview} />
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Renseignez les dates et le loyer pour voir l&apos;aperçu de l&apos;échéancier.
                  </p>
                ))}
            </CardContent>
          </Card>

          {/* Conditions du bail */}
          <Card className="animate-fade-up" style={{ "--stagger": 5 } as React.CSSProperties}>
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
                    <FormDescription>
                      Clauses spéciales, règlements, etc.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <AddTenantDialog
            open={addTenantOpen}
            onOpenChange={setAddTenantOpen}
            onSelect={handleTenantFound}
            onInvited={refreshPendingInvitations}
          />

          <FormActions
            submitLabel="Créer le bail"
            isSubmitting={isSubmitting}
            onCancel={() => router.back()}
          />
        </form>
      </Form>
    </div>
  );
}
