"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PageHeader } from "@/components/shared/page-header"
import { EmptyState } from "@/components/shared/empty-state"
import { StatCard } from "@/components/dashboard/stat-card"
import type { MessageFilter, MessageItem } from "@/components/messages/types"
import { excerpt, otherParticipant } from "@/lib/messages"
import { formatRelativeDate } from "@/lib/notifications"
import { initials, userRoleLabel } from "@/lib/users"
import { cn } from "@/lib/utils"
import { Inbox, Mail, MailOpen, PenSquare, Send } from "lucide-react"
import { toast } from "sonner"

function ListSkeleton() {
  return (
    <div className="animate-fade-in space-y-6" aria-busy="true" aria-live="polite">
      <div className="space-y-2">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-96 rounded-xl" />
    </div>
  )
}

export default function MessagesPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const [messages, setMessages] = useState<MessageItem[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<MessageFilter>("all")

  useEffect(() => {
    const load = async () => {
      try {
        const response = await fetch("/api/messages")
        if (!response.ok) throw new Error("Erreur lors du chargement des messages")
        const data = await response.json()
        setMessages(data.messages)
      } catch (error) {
        console.error("Erreur:", error)
        toast.error("Erreur lors du chargement des messages")
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading || !session?.user) return <ListSkeleton />

  const me = session.user.id
  const received = messages.filter((m) => m.receiverId === me)
  const sent = messages.filter((m) => m.senderId === me)
  const unread = received.filter((m) => !m.read)

  const visible = filter === "received" ? received : filter === "sent" ? sent : messages

  return (
    <div className="space-y-6">
      <PageHeader
        title="Messages"
        description="Échangez avec vos locataires, propriétaires et gestionnaires"
        actions={
          <Button asChild>
            <Link href="/messages/new">
              <PenSquare className="h-4 w-4" aria-hidden />
              Nouveau message
            </Link>
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          index={0}
          title="Non lus"
          value={unread.length}
          description={unread.length > 0 ? "À consulter" : "Vous êtes à jour"}
          icon={Mail}
          tone={unread.length > 0 ? "primary" : "default"}
        />
        <StatCard index={1} title="Reçus" value={received.length} icon={Inbox} tone="info" />
        <StatCard index={2} title="Envoyés" value={sent.length} icon={Send} tone="default" />
      </div>

      <Card className="animate-fade-up gap-0 py-0" style={{ "--stagger": 3 } as React.CSSProperties}>
        <CardHeader className="border-b py-4">
          <CardTitle className="flex items-center gap-2">
            <MailOpen className="h-4 w-4 text-muted-foreground" aria-hidden />
            Boîte de réception
          </CardTitle>
          <CardAction>
            <Tabs value={filter} onValueChange={(v) => setFilter(v as MessageFilter)}>
              <TabsList aria-label="Filtrer les messages">
                <TabsTrigger value="all">Tous</TabsTrigger>
                <TabsTrigger value="received">Reçus</TabsTrigger>
                <TabsTrigger value="sent">Envoyés</TabsTrigger>
              </TabsList>
            </Tabs>
          </CardAction>
        </CardHeader>
        <CardContent className="px-0 py-0">
          {visible.length === 0 ? (
            <div className="p-4 sm:p-5">
              <EmptyState
                size="sm"
                icon={Inbox}
                title={filter === "sent" ? "Aucun message envoyé" : "Aucun message"}
                description={
                  filter === "sent"
                    ? "Les messages que vous envoyez apparaîtront ici."
                    : "Vous n'avez pas encore de message. Écrivez à un contact pour démarrer un échange."
                }
                action={
                  <Button asChild>
                    <Link href="/messages/new">
                      <PenSquare className="h-4 w-4" aria-hidden />
                      Nouveau message
                    </Link>
                  </Button>
                }
              />
            </div>
          ) : (
            <ul className="divide-y">
              {visible.map((message) => {
                const other = otherParticipant(me, message)
                const isSent = message.senderId === me
                const isUnread = !isSent && !message.read
                return (
                  <li key={message.id}>
                    <Link
                      href={`/messages/${message.id}`}
                      onClick={(e) => {
                        e.preventDefault()
                        router.push(`/messages/${message.id}`)
                      }}
                      aria-label={`${isUnread ? "Non lu : " : ""}${isSent ? "À" : "De"} ${other.name}, ${message.subject}`}
                      className={cn(
                        "flex items-start gap-3 px-4 py-3 transition-colors hover:bg-muted/50 sm:px-5",
                        isUnread && "bg-primary/[0.04]"
                      )}
                    >
                      <Avatar className="mt-0.5 h-9 w-9 shrink-0">
                        <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                          {initials(other.name)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          {isUnread && (
                            <span aria-hidden className="h-2 w-2 shrink-0 rounded-full bg-primary" />
                          )}
                          <span className={cn("truncate text-sm", isUnread ? "font-semibold" : "font-medium")}>
                            {isSent && <span className="text-muted-foreground">À : </span>}
                            {other.name}
                          </span>
                          <Badge variant="muted" className="hidden sm:inline-flex">
                            {userRoleLabel(other.role)}
                          </Badge>
                        </span>
                        <span className={cn("mt-0.5 block truncate text-sm", isUnread ? "font-medium" : "text-foreground/90")}>
                          {message.subject}
                        </span>
                        <span className="mt-0.5 block truncate text-sm text-muted-foreground">
                          {excerpt(message.content)}
                        </span>
                      </span>
                      <time
                        dateTime={message.createdAt}
                        className="mt-1 shrink-0 text-xs text-muted-foreground tabular-nums"
                      >
                        {formatRelativeDate(message.createdAt)}
                      </time>
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
