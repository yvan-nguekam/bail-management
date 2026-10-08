"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { PageHeader } from "@/components/shared/page-header"
import { EmptyState } from "@/components/shared/empty-state"
import {
  NOTIFICATIONS_CHANGED_EVENT,
  formatRelativeDate,
  groupByReadState,
  notificationMeta,
} from "@/lib/notifications"
import { cn } from "@/lib/utils"
import { Bell, BellOff, CheckCheck, ChevronRight, Loader2 } from "lucide-react"
import { toast } from "sonner"

interface NotificationItem {
  id: string
  type: string
  title: string
  message: string
  read: boolean
  readAt: string | null
  link: string | null
  relatedId: string | null
  createdAt: string
}

const toneClasses = {
  default: "bg-muted text-muted-foreground",
  primary: "bg-primary/10 text-primary",
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  danger: "bg-destructive/10 text-destructive",
  info: "bg-info/10 text-info",
} as const

function ListSkeleton() {
  return (
    <div className="animate-fade-in space-y-6" aria-busy="true" aria-live="polite">
      <div className="space-y-2">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      <Skeleton className="h-64 rounded-xl" />
      <Skeleton className="h-40 rounded-xl" />
    </div>
  )
}

function NotificationRow({
  notification,
  onOpen,
  busy,
}: {
  notification: NotificationItem
  onOpen: (n: NotificationItem) => void
  busy: boolean
}) {
  const meta = notificationMeta(notification.type)
  const Icon = meta.icon

  return (
    <li>
      <button
        type="button"
        onClick={() => onOpen(notification)}
        disabled={busy}
        aria-label={`${notification.read ? "" : "Non lue : "}${notification.title}${
          notification.link ? ", ouvrir" : ", marquer comme lue"
        }`}
        className={cn(
          "flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50 disabled:opacity-60 sm:px-5",
          !notification.read && "bg-primary/[0.04]"
        )}
      >
        <span
          className={cn(
            "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
            toneClasses[meta.tone]
          )}
        >
          <Icon className="h-4 w-4" aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            {!notification.read && (
              <span aria-hidden className="h-2 w-2 shrink-0 rounded-full bg-primary" />
            )}
            <span
              className={cn(
                "truncate text-sm",
                notification.read ? "font-medium text-foreground/90" : "font-semibold"
              )}
            >
              {notification.title}
            </span>
          </span>
          <span className="mt-0.5 line-clamp-2 block text-sm text-muted-foreground">
            {notification.message}
          </span>
          <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
            <span>{meta.label}</span>
            <span aria-hidden>·</span>
            <time dateTime={notification.createdAt}>{formatRelativeDate(notification.createdAt)}</time>
          </span>
        </span>
        {notification.link && (
          <ChevronRight className="mt-2 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
        )}
      </button>
    </li>
  )
}

export default function NotificationsPage() {
  const router = useRouter()
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [loading, setLoading] = useState(true)
  const [marking, setMarking] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      try {
        const response = await fetch("/api/notifications")
        if (!response.ok) throw new Error("Erreur lors du chargement des notifications")
        const data = await response.json()
        setNotifications(data.notifications)
      } catch (error) {
        console.error("Erreur:", error)
        toast.error("Erreur lors du chargement des notifications")
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const markRead = async (id: string) => {
    const response = await fetch(`/api/notifications/${id}/mark-read`, { method: "POST" })
    if (!response.ok) throw new Error("Erreur lors de la mise à jour")
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true, readAt: new Date().toISOString() } : n))
    )
    window.dispatchEvent(new Event(NOTIFICATIONS_CHANGED_EVENT))
  }

  const handleOpen = async (notification: NotificationItem) => {
    setBusyId(notification.id)
    try {
      if (!notification.read) await markRead(notification.id)
      if (notification.link) {
        router.push(notification.link)
        return
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur lors de la mise à jour")
    } finally {
      setBusyId(null)
    }
  }

  const handleMarkAll = async () => {
    setMarking(true)
    try {
      const response = await fetch("/api/notifications/mark-all-read", { method: "POST" })
      if (!response.ok) throw new Error("Erreur lors de la mise à jour")
      const now = new Date().toISOString()
      setNotifications((prev) => prev.map((n) => (n.read ? n : { ...n, read: true, readAt: now })))
      toast.success("Toutes les notifications ont été marquées comme lues")
      window.dispatchEvent(new Event(NOTIFICATIONS_CHANGED_EVENT))
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur lors de la mise à jour")
    } finally {
      setMarking(false)
    }
  }

  if (loading) return <ListSkeleton />

  const { unread, read } = groupByReadState(notifications)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notifications"
        description="Paiements, baux, maintenance et messages qui vous concernent"
        actions={
          <Button
            variant="outline"
            onClick={handleMarkAll}
            disabled={marking || unread.length === 0}
          >
            {marking ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <CheckCheck className="h-4 w-4" aria-hidden />
            )}
            Tout marquer comme lu
          </Button>
        }
      />

      {notifications.length === 0 ? (
        <EmptyState
          icon={BellOff}
          title="Aucune notification"
          description="Vous serez prévenu ici des paiements, des échéances de bail, des demandes de maintenance et des messages."
        />
      ) : (
        <>
          <Card className="animate-fade-up gap-0 py-0" style={{ "--stagger": 1 } as React.CSSProperties}>
            <CardHeader className="border-b py-4">
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-muted-foreground" aria-hidden />
                Non lues
                <Badge variant={unread.length > 0 ? "info" : "muted"} className="tabular-nums">
                  {unread.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="px-0 py-0">
              {unread.length === 0 ? (
                <p className="px-5 py-6 text-sm text-muted-foreground">
                  Vous êtes à jour : aucune notification non lue.
                </p>
              ) : (
                <ul className="divide-y">
                  {unread.map((n) => (
                    <NotificationRow key={n.id} notification={n} onOpen={handleOpen} busy={busyId === n.id} />
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {read.length > 0 && (
            <Card className="animate-fade-up gap-0 py-0" style={{ "--stagger": 2 } as React.CSSProperties}>
              <CardHeader className="border-b py-4">
                <CardTitle className="flex items-center gap-2">
                  <CheckCheck className="h-4 w-4 text-muted-foreground" aria-hidden />
                  Lues
                  <Badge variant="muted" className="tabular-nums">
                    {read.length}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="px-0 py-0">
                <ul className="divide-y">
                  {read.map((n) => (
                    <NotificationRow key={n.id} notification={n} onOpen={handleOpen} busy={busyId === n.id} />
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
