"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { ArrowLeft, Loader2, FileText, Building2, User, CalendarClock } from "lucide-react";
import { PaymentScheduleTable } from "@/components/leases/payment-schedule-table";
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

interface User {
  id: string;
  name: string;
  email: string;
}

export default function NewLeasePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedPropertyId = searchParams.get("propertyId");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [properties, setProperties] = useState<Property[]>([]);
  const [tenants, setTenants] = useState<User[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  const form = useForm<z.input<typeof leaseSchema>, unknown, LeaseFormData>({
    resolver: zodResolver(leaseSchema),
    defaultValues: {
      propertyId: preselectedPropertyId || "",
      tenantId: "",
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
        fetch("/api/users?role=TENANT"),
      ]);

      if (propertiesRes.ok) {
        const data = await propertiesRes.json();
        setProperties(data.properties);
      }

      if (tenantsRes.ok) {
        const data = await tenantsRes.json();
        setTenants(data);
      }
    } catch (error) {
      console.error("Erreur:", error);
      toast.error("Erreur lors du chargement des données");
    } finally {
      setLoadingData(false);
    }
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
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Nouveau bail</h1>
          <p className="text-muted-foreground">
            Créez un nouveau contrat de location
          </p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Sélection propriété et locataire */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Informations du bail
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="propertyId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Propriété</FormLabel>
                    <Select
                      onValueChange={(value) => {
                        field.onChange(value);
                        handlePropertyChange(value);
                      }}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner une propriété" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {properties.length === 0 ? (
                          <div className="p-2 text-sm text-muted-foreground">
                            Aucune propriété disponible
                          </div>
                        ) : (
                          properties.map((property) => (
                            <SelectItem key={property.id} value={property.id}>
                              <div className="flex items-center gap-2">
                                <Building2 className="h-4 w-4" />
                                <div>
                                  <div className="font-medium">
                                    {property.name}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {property.address}, {property.city}
                                  </div>
                                </div>
                              </div>
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
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner un locataire" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {tenants.length === 0 ? (
                          <div className="p-2 text-sm text-muted-foreground">
                            Aucun locataire disponible
                          </div>
                        ) : (
                          tenants.map((tenant) => (
                            <SelectItem key={tenant.id} value={tenant.id}>
                              <div className="flex items-center gap-2">
                                <User className="h-4 w-4" />
                                <div>
                                  <div className="font-medium">
                                    {tenant.name}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {tenant.email}
                                  </div>
                                </div>
                              </div>
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Période du bail */}
          <Card>
            <CardHeader>
              <CardTitle>Période du bail</CardTitle>
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
          <Card>
            <CardHeader>
              <CardTitle>Informations financières</CardTitle>
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
                        Rempli automatiquement depuis la propriété
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
                        Rempli automatiquement depuis la propriété
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
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarClock className="h-5 w-5" />
                Échéancier des loyers
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="generateSchedule"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start gap-3 space-y-0">
                    <FormControl>
                      <input
                        type="checkbox"
                        className="mt-1 h-4 w-4 accent-primary"
                        checked={field.value}
                        onChange={(event) => field.onChange(event.target.checked)}
                        onBlur={field.onBlur}
                        name={field.name}
                        ref={field.ref}
                      />
                    </FormControl>
                    <div className="space-y-1">
                      <FormLabel>Générer automatiquement les échéances</FormLabel>
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
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      {schedulePreview.length} échéance
                      {schedulePreview.length > 1 ? "s" : ""} pour un total de{" "}
                      <span className="font-medium text-foreground">
                        {formatCurrency(scheduleTotal(schedulePreview))}
                      </span>
                    </p>
                    <div className="max-h-72 overflow-y-auto rounded-md border">
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
          <Card>
            <CardHeader>
              <CardTitle>Conditions du bail</CardTitle>
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
                        placeholder="Décrivez les conditions du bail..."
                        className="min-h-[150px]"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Clause spéciales, règlements, etc.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <div className="flex gap-4">
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
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Créer le bail
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
