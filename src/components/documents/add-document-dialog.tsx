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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { FileDropzone } from "@/components/uploads/file-dropzone"
import { DOCUMENT_TYPES, documentTypeLabels, isAllowedDocumentUrl } from "@/lib/documents"
import { isUploadEnabled } from "@/lib/upload-config"
import { Link2, Loader2, Plus, Upload } from "lucide-react"
import { toast } from "sonner"

// Valeur sentinelle : Radix Select n'accepte pas de valeur vide
const NONE = "none"

type Mode = "upload" | "link"

// Nom et lien obligatoires pour un ajout par lien ; à l'envoi, le nom du fichier sert par défaut.
const schema = z
  .object({
    mode: z.enum(["upload", "link"]),
    name: z.string().trim().max(150, "150 caractères maximum"),
    type: z.enum(DOCUMENT_TYPES),
    url: z.string().trim(),
    propertyId: z.string(),
    leaseId: z.string(),
  })
  .superRefine((data, ctx) => {
    if (data.mode !== "link") return
    if (!data.name) ctx.addIssue({ code: "custom", path: ["name"], message: "Le nom est requis" })
    if (!isAllowedDocumentUrl(data.url)) {
      ctx.addIssue({
        code: "custom",
        path: ["url"],
        message: "Saisissez une adresse complète en https://…",
      })
    }
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
  // Envoi de fichiers en onglet principal ; « Par lien » par défaut s'il n'est pas configuré
  const defaultMode: Mode = isUploadEnabled() ? "upload" : "link"

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      mode: defaultMode,
      name: "",
      type: "OTHER",
      url: "",
      propertyId: NONE,
      leaseId: NONE,
    },
  })

  const mode = useWatch({ control: form.control, name: "mode" })
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

  // Données de la route d'envoi "document", lues au moment où le fichier est déposé
  const getUploadInput = async () => {
    const valid = await form.trigger(["name", "type", "propertyId", "leaseId"])
    if (!valid) return null
    const data = form.getValues()
    return {
      name: data.name.trim() || undefined,
      type: data.type,
      propertyId: data.propertyId === NONE ? undefined : data.propertyId,
      leaseId: data.leaseId === NONE ? undefined : data.leaseId,
    }
  }

  const onUploaded = () => {
    toast.success("Document téléversé")
    onOpenChange(false)
    onCreated()
  }

  const onSubmit = async (data: FormData) => {
    if (data.mode !== "link") return
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
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Ajouter un document</DialogTitle>
          <DialogDescription>
            Téléversez un fichier depuis votre appareil ou référencez un fichier déjà hébergé
            (Drive, Dropbox…), puis rattachez-le à un bien ou à un bail.
          </DialogDescription>
        </DialogHeader>

        <Tabs
          value={mode}
          onValueChange={(value) => {
            form.clearErrors()
            form.setValue("mode", value as Mode)
          }}
        >
          <TabsList className="w-full">
            <TabsTrigger value="upload">
              <Upload aria-hidden />
              Téléverser
            </TabsTrigger>
            <TabsTrigger value="link">
              <Link2 aria-hidden />
              Par lien
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{mode === "upload" ? "Nom (optionnel)" : "Nom"}</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex. : Contrat de bail signé" {...field} />
                  </FormControl>
                  {mode === "upload" && (
                    <FormDescription>Par défaut, le nom du fichier.</FormDescription>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />
            {mode === "link" && (
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
            )}
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
            {mode === "upload" && (
              <FileDropzone
                endpoint="document"
                getInput={getUploadInput}
                onUploaded={onUploaded}
                disabledHint="Utilisez l'onglet « Par lien »."
              />
            )}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                {mode === "upload" ? "Fermer" : "Annuler"}
              </Button>
              {mode === "link" && (
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  ) : (
                    <Plus className="h-4 w-4" aria-hidden />
                  )}
                  Ajouter
                </Button>
              )}
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
