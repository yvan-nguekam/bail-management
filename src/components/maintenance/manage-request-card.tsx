"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
  MAINTENANCE_PRIORITIES,
  MAINTENANCE_STATUSES,
  getAllowedNextStatuses,
  maintenancePriorityLabels,
  maintenanceStatusLabels,
  roleLabels,
  type UserRoleValue,
} from "@/lib/maintenance";
import type { MaintenanceDetail } from "./types";
import { Loader2, Settings2 } from "lucide-react";
import { toast } from "sonner";

const UNASSIGNED = "none";

const manageSchema = z.object({
  status: z.enum(MAINTENANCE_STATUSES),
  priority: z.enum(MAINTENANCE_PRIORITIES),
  assignedToId: z.string(),
  scheduledDate: z.string(),
  cost: z
    .string()
    .refine(
      (v) => v.trim() === "" || (!Number.isNaN(Number(v)) && Number(v) >= 0),
      "Montant invalide"
    ),
});

type ManageFormData = z.infer<typeof manageSchema>;

interface AssigneeOption {
  id: string;
  name: string;
  email: string;
  role?: UserRoleValue;
}

interface ManageRequestCardProps {
  request: MaintenanceDetail;
  onUpdated: () => void;
}

/**
 * Pilotage d'une demande (statut, priorité, intervenant, planification, coût).
 * Réservé aux admins et aux propriétaires/gestionnaires du bien — l'API le vérifie aussi.
 */
export function ManageRequestCard({ request, onUpdated }: ManageRequestCardProps) {
  const [assignees, setAssignees] = useState<AssigneeOption[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const form = useForm<ManageFormData>({
    resolver: zodResolver(manageSchema),
    defaultValues: {
      status: request.status,
      priority: request.priority,
      assignedToId: request.assignedToId ?? UNASSIGNED,
      scheduledDate: request.scheduledDate ? request.scheduledDate.split("T")[0] : "",
      cost: request.cost != null ? String(request.cost) : "",
    },
  });

  useEffect(() => {
    // Intervenants possibles : utilisateurs non locataires (admin, propriétaires, gestionnaires)
    const fetchAssignees = async () => {
      try {
        const response = await fetch("/api/users");
        if (!response.ok) return;
        const users: AssigneeOption[] = await response.json();
        setAssignees(users.filter((u) => u.role !== "TENANT"));
      } catch {
        // Liste vide : l'assignation reste possible via l'intervenant actuel
      }
    };
    fetchAssignees();
  }, []);

  // Garder l'intervenant actuel sélectionnable même s'il n'est pas dans la liste
  const assigneeOptions =
    request.assignedTo && !assignees.some((a) => a.id === request.assignedTo?.id)
      ? [request.assignedTo as AssigneeOption, ...assignees]
      : assignees;

  const statusOptions = [request.status, ...getAllowedNextStatuses(request.status)];

  const onSubmit = async (data: ManageFormData) => {
    setIsSaving(true);
    try {
      const payload: Record<string, unknown> = {
        priority: data.priority,
        assignedToId: data.assignedToId === UNASSIGNED ? null : data.assignedToId,
        scheduledDate: data.scheduledDate
          ? new Date(data.scheduledDate).toISOString()
          : null,
        cost: data.cost.trim() === "" ? null : Number(data.cost),
      };
      if (data.status !== request.status) {
        payload.status = data.status;
      }

      const response = await fetch(`/api/maintenance/${request.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erreur lors de la mise à jour");
      }

      toast.success("Demande mise à jour");
      onUpdated();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Erreur lors de la mise à jour"
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings2 className="h-5 w-5" />
          Gestion
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Statut</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {statusOptions.map((s) => (
                        <SelectItem key={s} value={s}>
                          {maintenanceStatusLabels[s]}
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
              name="priority"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Priorité</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="w-full">
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
              name="assignedToId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Intervenant</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={UNASSIGNED}>Non assignée</SelectItem>
                      {assigneeOptions.map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.name}
                          {u.role ? ` — ${roleLabels[u.role]}` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Administrateurs, propriétaires et gestionnaires
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="scheduledDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Intervention prévue le</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="cost"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Coût (FCFA)</FormLabel>
                  <FormControl>
                    <Input type="number" min="0" step="any" placeholder="—" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full" disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Enregistrer
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
