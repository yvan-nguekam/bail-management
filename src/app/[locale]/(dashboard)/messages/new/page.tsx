"use client"

import { Suspense, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
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
import { PageHeader } from "@/components/shared/page-header"
import { EmptyState } from "@/components/shared/empty-state"
import type { Contact } from "@/lib/messages"
import { userRoleLabel } from "@/lib/users"
import { Loader2, Send, Users } from "lucide-react"
import { toast } from "sonner"

const messageSchema = z.object({
  receiverId: z.string().min(1, "Choisissez un destinataire"),
  subject: z.string().trim().min(1, "Le sujet est requis").max(150, "150 caractères maximum"),
  content: z.string().trim().min(1, "Le message est requis").max(5000, "5000 caractères maximum"),
})

type MessageFormData = z.infer<typeof messageSchema>

function FormSkeleton() {
  return (
    <div className="animate-fade-in space-y-6" aria-busy="true" aria-live="polite">
      <div className="space-y-2">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      <Skeleton className="h-96 rounded-xl" />
    </div>
  )
}

function NewMessageForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const presetTo = searchParams.get("to") ?? ""
  const presetSubject = searchParams.get("subject") ?? ""

  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<MessageFormData>({
    resolver: zodResolver(messageSchema),
    defaultValues: { receiverId: "", subject: presetSubject, content: "" },
  })

  useEffect(() => {
    const load = async () => {
      try {
        const response = await fetch("/api/messages/contacts")
        if (!response.ok) throw new Error()
        const data = await response.json()
        const list: Contact[] = data.contacts
        setContacts(list)
        // Présélection (?to=) seulement si le contact est autorisé
        if (presetTo && list.some((c) => c.id === presetTo)) {
          form.setValue("receiverId", presetTo)
        }
      } catch {
        toast.error("Erreur lors du chargement des contacts")
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [presetTo, form])

  const onSubmit = async (data: MessageFormData) => {
    setIsSubmitting(true)
    try {
      const response = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Erreur lors de l'envoi")
      }
      const created = await response.json()
      toast.success("Message envoyé")
      router.push(`/messages/${created.id}`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur lors de l'envoi")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loading) return <FormSkeleton />

  return (
    <div className="space-y-6">
      <PageHeader
        title="Nouveau message"
        description="Écrivez à un contact lié à vos biens ou à vos baux"
        backHref="/messages"
      />

      {contacts.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Aucun contact disponible"
          description="Vous pourrez écrire à vos interlocuteurs dès qu'un bail vous reliera à un bien."
        />
      ) : (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Card className="animate-fade-up" style={{ "--stagger": 1 } as React.CSSProperties}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Send className="h-4 w-4 text-muted-foreground" aria-hidden />
                  Message
                </CardTitle>
                <CardDescription>
                  Le destinataire recevra une notification dès l&apos;envoi.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="receiverId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Destinataire</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Choisir un contact" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {contacts.map((contact) => (
                            <SelectItem key={contact.id} value={contact.id}>
                              {contact.name}
                              <span className="text-muted-foreground"> · {userRoleLabel(contact.role)}</span>
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
                  name="subject"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sujet</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex. : Question sur le loyer de novembre" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="content"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Message</FormLabel>
                      <FormControl>
                        <Textarea rows={8} placeholder="Votre message…" {...field} />
                      </FormControl>
                      <FormDescription>5000 caractères maximum.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" onClick={() => router.back()} disabled={isSubmitting}>
                Annuler
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                ) : (
                  <Send className="h-4 w-4" aria-hidden />
                )}
                Envoyer
              </Button>
            </div>
          </form>
        </Form>
      )}
    </div>
  )
}

export default function NewMessagePage() {
  return (
    <Suspense fallback={<FormSkeleton />}>
      <NewMessageForm />
    </Suspense>
  )
}
