"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { Button, buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { PageHeader } from "@/components/shared/page-header"
import type { MessageItem } from "@/components/messages/types"
import { otherParticipant, replySubject } from "@/lib/messages"
import { NOTIFICATIONS_CHANGED_EVENT } from "@/lib/notifications"
import { initials, userRoleLabel } from "@/lib/users"
import { Loader2, Reply, Trash2 } from "lucide-react"
import { toast } from "sonner"

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("fr-FR", { dateStyle: "long", timeStyle: "short" })
}

function DetailSkeleton() {
  return (
    <div className="animate-fade-in space-y-6" aria-busy="true" aria-live="polite">
      <div className="space-y-2">
        <Skeleton className="h-8 w-72 max-w-full" />
        <Skeleton className="h-5 w-48" />
      </div>
      <Skeleton className="h-80 rounded-xl" />
    </div>
  )
}

export default function MessageDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const { data: session } = useSession()
  const [message, setMessage] = useState<MessageItem | null>(null)
  const [loading, setLoading] = useState(true)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    const load = async () => {
      try {
        const response = await fetch(`/api/messages/${params.id}`)
        if (!response.ok) throw new Error("Message non trouvé")
        setMessage(await response.json())
        // Ouvrir un message le marque lu : la notification liée reste, mais le badge peut changer
        window.dispatchEvent(new Event(NOTIFICATIONS_CHANGED_EVENT))
      } catch (error) {
        console.error("Erreur:", error)
        toast.error("Erreur lors du chargement du message")
        router.push("/messages")
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [params.id, router])

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      const response = await fetch(`/api/messages/${params.id}`, { method: "DELETE" })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Erreur lors de la suppression")
      }
      toast.success("Message supprimé")
      router.push("/messages")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur lors de la suppression")
    } finally {
      setIsDeleting(false)
      setDeleteOpen(false)
    }
  }

  if (loading || !session?.user) return <DetailSkeleton />
  if (!message) return null

  const me = session.user.id
  const isSent = message.senderId === me
  const other = otherParticipant(me, message)
  const replyHref = `/messages/new?to=${encodeURIComponent(other.id)}&subject=${encodeURIComponent(
    replySubject(message.subject)
  )}`

  return (
    <div className="space-y-6">
      <PageHeader
        title={message.subject}
        backHref="/messages"
        wrapTitle
        actions={
          <>
            <Button variant="outline" onClick={() => setDeleteOpen(true)}>
              <Trash2 className="h-4 w-4" aria-hidden />
              Supprimer
            </Button>
            <Button asChild>
              <Link href={replyHref}>
                <Reply className="h-4 w-4" aria-hidden />
                Répondre
              </Link>
            </Button>
          </>
        }
      >
        <Badge variant={isSent ? "muted" : "info"}>{isSent ? "Envoyé" : "Reçu"}</Badge>
        <span className="text-sm text-muted-foreground">
          <time dateTime={message.createdAt}>{formatDateTime(message.createdAt)}</time>
        </span>
      </PageHeader>

      <Card className="animate-fade-up" style={{ "--stagger": 1 } as React.CSSProperties}>
        <CardHeader className="border-b">
          <CardTitle className="sr-only">Correspondants</CardTitle>
          <div className="flex items-start gap-3">
            <Avatar className="h-10 w-10 shrink-0">
              <AvatarFallback className="bg-primary/10 text-sm font-semibold text-primary">
                {initials(message.sender.name)}
              </AvatarFallback>
            </Avatar>
            <dl className="min-w-0 flex-1 space-y-1 text-sm">
              <div className="flex flex-wrap items-baseline gap-x-2">
                <dt className="text-muted-foreground">De :</dt>
                <dd className="font-medium">
                  {isSent ? "Vous" : message.sender.name}
                  <span className="font-normal text-muted-foreground">
                    {" "}
                    · {userRoleLabel(message.sender.role)} · {message.sender.email}
                  </span>
                </dd>
              </div>
              <div className="flex flex-wrap items-baseline gap-x-2">
                <dt className="text-muted-foreground">À :</dt>
                <dd className="font-medium">
                  {isSent ? message.receiver.name : "Vous"}
                  <span className="font-normal text-muted-foreground">
                    {" "}
                    · {userRoleLabel(message.receiver.role)} · {message.receiver.email}
                  </span>
                </dd>
              </div>
              {isSent && (
                <div className="flex flex-wrap items-baseline gap-x-2">
                  <dt className="text-muted-foreground">Statut :</dt>
                  <dd>
                    {message.read && message.readAt
                      ? `Lu le ${formatDateTime(message.readAt)}`
                      : "Non lu"}
                  </dd>
                </div>
              )}
            </dl>
          </div>
        </CardHeader>
        <CardContent>
          <p className="whitespace-pre-wrap text-sm leading-relaxed">{message.content}</p>
        </CardContent>
      </Card>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce message ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Le message sera supprimé pour les deux
              correspondants.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                handleDelete()
              }}
              disabled={isDeleting}
              className={buttonVariants({ variant: "destructive" })}
            >
              {isDeleting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
