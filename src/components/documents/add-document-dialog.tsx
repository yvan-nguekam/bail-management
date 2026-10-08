"use client"

import { useEffect, useState } from "react"
import { useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { DOCUMENT_TYPES, documentTypeLabels } from "@/lib/documents"
import { Info, Loader2, Plus } from "lucide-react"
import { toast } from "sonner"

// Valeur sentinelle : Radix Select n'accepte pas de valeur vide
const NONE = "none"

const schema = z.object({
  name: z.string().trim().min(1, "Le nom est requis").max(150, "150 caractères maximum"),
  type: z.enum(DOCUMENT_TYPES),
  url: z.string().trim().url("Saisissez une URL complète (https://…)"),
  propertyId: z.string(),
  leaseId: z.string(),
})

type FormData = z.infer<typeof schema>

export interface PropertyOption {
  id: string
  name: string
}

export interface LeaseOption {
  id: string
  propertyId: string
  property: { name: string }
  tenant: { name: string }
  startDate: string
}

interface AddDocumentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  properties: PropertyOption[]
  leases: LeaseOption[]
  onCreated: () => void
}

export function AddDocumentDialog({
  open,
  onOpenChange,
  properties,
  leases,
  onCreated,
}: AddDocumentDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", type: "OTHER", url: "", propertyId: NONE, leaseId: NONE },
  })

  const propertyId = useWatch({ control: form.control, name: "propertyId" })
  const visibleLeases = propertyId === NONE ? leases : leases.filter((l) => l.propertyId === propertyId)

  // Un bail d'un autre bien ne reste pas sélectionné
  useEffect(() => {
    const leaseId = form.getValues("leaseId")
    if (leaseId !== NONE && !visibleLeases.some((l) => l.id === leaseId)) {
      form.setValue("leaseId", NONE)
    }
  }, [propertyId, visibleLeases, form])

  useEffect(() => {
    if (!open) form.reset()
  }, [open, form])

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true)
    try {
      const response = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.name,
          type: data.type,
          url: data.url,
          propertyId: data.propertyId === NONE ? undefined : data.propertyId,
          leaseId: data.leaseId === NONE ? undefined : data.leaseId,
        }),
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Erreur lors de l'ajout")
      }
      toast.success("Document ajouté")
      onOpenChange(false)
      onCreated()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur lors de l'ajout")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Ajouter un document par lien</DialogTitle>
          <DialogDescription>
            Référencez un fichier déjà hébergé (Drive, Dropbox, site…) et rattachez-le à un bien ou à un bail.
          </DialogDescription>
        </DialogHeader>

        <p className="flex items-start gap-2 rounded-lg border border-info/25 bg-info/10 px-3 py-2 text-sm text-info">
          <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          L&apos;envoi de fichiers depuis votre appareil arrivera dans une prochaine version.
        </p>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nom</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex. : Contrat de bail signé" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Lien</FormLabel>
                  <FormControl>
                    <Input type="url" inputMode="url" placeholder="https://…" {...field} />
                  </FormControl>
                  <FormDescription>Le type de fichier est déduit de l&apos;extension.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {DOCUMENT_TYPES.map((t) => (
                          <SelectItem key={t} value={t}>
                            {documentTypeLabels[t]}
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
                name="propertyId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bien (optionnel)</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={NONE}>Aucun</SelectItem>
                        {properties.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="leaseId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bail (optionnel)</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={NONE}>Aucun</SelectItem>
                      {visibleLeases.map((l) => (
                        <SelectItem key={l.id} value={l.id}>
                          {l.property.name} · {l.tenant.name} ·{" "}
                          {new Date(l.startDate).toLocaleDateString("fr-FR", { timeZone: "UTC" })}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                Annuler
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                ) : (
                  <Plus className="h-4 w-4" aria-hidden />
                )}
                Ajouter
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
