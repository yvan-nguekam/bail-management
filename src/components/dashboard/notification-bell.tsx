"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Bell } from "lucide-react"
import { Button } from "@/components/ui/button"
import { NOTIFICATIONS_CHANGED_EVENT } from "@/lib/notifications"

const REFRESH_MS = 60_000

/** Cloche du header avec le nombre de notifications non lues (rafraîchi toutes les 60 s). */
export function NotificationBell() {
  const pathname = usePathname()
  const [unread, setUnread] = useState(0)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      try {
        const response = await fetch("/api/notifications/unread-count")
        if (!response.ok) return
        const data = await response.json()
        if (!cancelled) setUnread(Number(data.unreadCount) || 0)
      } catch {
        // Silencieux : le badge n'est qu'une indication
      }
    }

    load()
    const timer = setInterval(load, REFRESH_MS)
    window.addEventListener("focus", load)
    window.addEventListener(NOTIFICATIONS_CHANGED_EVENT, load)
    return () => {
      cancelled = true
      clearInterval(timer)
      window.removeEventListener("focus", load)
      window.removeEventListener(NOTIFICATIONS_CHANGED_EVENT, load)
    }
    // Rechargé aussi à chaque navigation
  }, [pathname])

  const label = unread > 0 ? `Notifications (${unread} non lue${unread > 1 ? "s" : ""})` : "Notifications"

  return (
    <Button variant="ghost" size="icon" className="relative" asChild>
      <Link href="/notifications" aria-label={label}>
        <Bell className="h-5 w-5" aria-hidden />
        {unread > 0 && (
          <span
            aria-hidden
            className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold leading-none text-primary-foreground tabular-nums"
          >
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </Link>
    </Button>
  )
}
