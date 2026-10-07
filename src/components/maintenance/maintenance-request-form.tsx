"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useForm, useWatch } from "react-hook-form";
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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  MAINTENANCE_CATEGORIES,
  MAINTENANCE_PRIORITIES,
  isStaffRole,
  maintenancePriorityLabels,
} from "@/lib/maintenance";
import { Building2, Loader2, Wrench } from "lucide-react";
import { toast } from "sonner";

// Valeurs sentinelles (Radix Select n'accepte pas de valeur vide)
const SELF = "self";
const NO_CATEGORY = "none";

const requestSchema = z.object({
  propertyId: z.string().min(1, "La propriété est requise"),
  requesterId: z.string(),
  title: z
    .string()
    .trim()
    .min(1, "Le titre est requis")
    .max(150, "150 caractères maximum"),
  description: z.string().trim().min(10, "Décrivez le problème (10 caractères minimum)"),
  priority: z.enum(MAINTENANCE_PRIORITIES),
  category: z.string(),
});

type RequestFormData = z.infer<typeof requestSchema>;

interface PropertyOption {
  id: string;
  name: string;
  address: string;
  city: string;
  leases: Array<{ tenant: { id: string; name: string; email: string } }>;
}

export function MaintenanceRequestForm() {
  const router = useRouter();
  const { data: session } = useSession();
  const isStaff = session?.user ? isStaffRole(session.user.role) : false;

  const [properties, setProperties] = useState<PropertyOption[]>([]);
  const [loadingProperties, setLoadingProperties] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<RequestFormData>({
    resolver: zodResolver(requestSchema),
    defaultValues: {
      propertyId: "",
      requesterId: SELF,
      title: "",
      description: "",
      priority: "MEDIUM",
      category: NO_CATEGORY,
    },
  });

  useEffect(() => {
    // /api/properties est déjà filtré par rôle : biens loués (bail actif) pour un
    // locataire, biens possédés/gérés pour propriétaire/gestionnaire, tous pour l'admin.
    const fetchProperties = async () => {
      try {
        const response = await fetch("/api/properties?limit=100");
        if (!response.ok) throw new Error();
        const data = await response.json();
        setProperties(data.properties);
      } catch {
        toast.error("Erreur lors du chargement des propriétés");
      } finally {
        setLoadingProperties(false);
      }
    };
    fetchProperties();
  }, []);

  const selectedPropertyId = useWatch({ control: form.control, name: "propertyId" });
  const selectedProperty = properties.find((p) => p.id === selectedPropertyId);
  const activeTenants = selectedProperty?.leases.map((l) => l.tenant) ?? [];

  const onSubmit = async (data: RequestFormData) => {
    setIsSubmitting(true);
    try {
      const payload = {
        propertyId: data.propertyId,
        title: data.title,
        description: data.description,
        priority: data.priority,
        category: data.category === NO_CATEGORY ? undefined : data.category,
        tenantId: isStaff && data.requesterId !== SELF ? data.requesterId : undefined,
      };

      const response = await fetch("/api/maintenance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erreur lors de la création");
      }

      const created = await response.json();
      toast.success("Demande créée avec succès");
      router.push(`/maintenance/${created.id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur lors de la création");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loadingProperties) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Bien concerné
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
                      form.setValue("requesterId", SELF);
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
                          {isStaff
                            ? "Aucune propriété disponible"
                            : "Aucun bail actif : vous ne pouvez pas créer de demande"}
                        </div>
                      ) : (
                        properties.map((property) => (
                          <SelectItem key={property.id} value={property.id}>
                            {property.name} — {property.address}, {property.city}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {isStaff && (
              <FormField
                control={form.control}
                name="requesterId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Demandeur</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      disabled={!selectedProperty}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={SELF}>Moi-même</SelectItem>
                        {activeTenants.map((tenant) => (
                          <SelectItem key={tenant.id} value={tenant.id}>
                            {tenant.name} ({tenant.email})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Ouvrez la demande pour le compte d&apos;un locataire en bail actif,
                      ou en votre nom (ex. parties communes).
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wrench className="h-5 w-5" />
              Description du problème
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Titre</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex. Fuite sous l'évier de la cuisine" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Décrivez le problème, depuis quand il est présent, l'accès au logement..."
                      className="min-h-[150px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Priorité</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {MAINTENANCE_PRIORITIES.map((p) => (
                          <SelectItem key={p} value={p}>
                            {maintenancePriorityLabels[p]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Catégorie</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={NO_CATEGORY}>Non précisée</SelectItem>
                        {MAINTENANCE_CATEGORIES.map((c) => (
                          <SelectItem key={c} value={c}>
                            {c}
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

        <div className="flex gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={isSubmitting}
          >
            Annuler
          </Button>
          <Button type="submit" disabled={isSubmitting || properties.length === 0}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Créer la demande
          </Button>
        </div>
      </form>
    </Form>
  );
}
