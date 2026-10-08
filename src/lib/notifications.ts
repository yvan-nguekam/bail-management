// Logique pure liée aux notifications (icône/teinte par type, dates relatives, regroupement).
// Aucune dépendance à Prisma/Next ici pour rester testable unitairement.

import {
  Bell,
  CalendarClock,
  CheckCircle2,
  FileSignature,
  FileText,
  Info,
  MessageSquare,
  PiggyBank,
  Receipt,
  RefreshCw,
  ShieldCheck,
  Wallet,
  Wrench,
  XCircle,
  type LucideIcon,
} from "lucide-react"

export const NOTIFICATION_TYPES = [
  "PAYMENT_REMINDER",
  "PAYMENT_RECEIVED",
  "PAYMENT_DUE",
  "LEASE_CREATED",
  "LEASE_RENEWED",
  "LEASE_TERMINATED",
  "LEASE_EXPIRING",
  "LEASE_EXPIRED",
  "LEASE_ACTIVATED",
  "MAINTENANCE_REQUEST",
  "MAINTENANCE_UPDATE",
  "MESSAGE",
  "DEPOSIT_RECEIVED",
  "DEPOSIT_SETTLED",
  "SYSTEM",
] as const

export type NotificationTypeValue = (typeof NOTIFICATION_TYPES)[number]

export type NotificationTone = "default" | "primary" | "success" | "warning" | "danger" | "info"

export interface NotificationMeta {
  icon: LucideIcon
  tone: NotificationTone
  /** Libellé court de la catégorie (utilisé pour l'accessibilité et les filtres) */
  label: string
}

const META: Record<NotificationTypeValue, NotificationMeta> = {
  PAYMENT_REMINDER: { icon: CalendarClock, tone: "warning", label: "Rappel de paiement" },
  PAYMENT_RECEIVED: { icon: CheckCircle2, tone: "success", label: "Paiement reçu" },
  PAYMENT_DUE: { icon: Wallet, tone: "danger", label: "Paiement en retard" },
  LEASE_CREATED: { icon: FileText, tone: "info", label: "Nouveau bail" },
  LEASE_RENEWED: { icon: RefreshCw, tone: "info", label: "Bail renouvelé" },
  LEASE_TERMINATED: { icon: XCircle, tone: "danger", label: "Bail résilié" },
  LEASE_EXPIRING: { icon: CalendarClock, tone: "warning", label: "Bail expirant" },
  LEASE_EXPIRED: { icon: FileSignature, tone: "warning", label: "Bail expiré" },
  LEASE_ACTIVATED: { icon: ShieldCheck, tone: "success", label: "Bail activé" },
  MAINTENANCE_REQUEST: { icon: Wrench, tone: "info", label: "Demande de maintenance" },
  MAINTENANCE_UPDATE: { icon: Wrench, tone: "primary", label: "Maintenance mise à jour" },
  MESSAGE: { icon: MessageSquare, tone: "primary", label: "Message" },
  DEPOSIT_RECEIVED: { icon: PiggyBank, tone: "success", label: "Caution reçue" },
  DEPOSIT_SETTLED: { icon: Receipt, tone: "success", label: "Caution restituée" },
  SYSTEM: { icon: Info, tone: "default", label: "Système" },
}

const FALLBACK: NotificationMeta = { icon: Bell, tone: "default", label: "Notification" }

/** Événement `window` émis quand des notifications sont lues (la cloche du header se rafraîchit). */
export const NOTIFICATIONS_CHANGED_EVENT = "notifications:changed"

export function isNotificationType(value: unknown): value is NotificationTypeValue {
  return typeof value === "string" && (NOTIFICATION_TYPES as readonly string[]).includes(value)
}

/** Icône, teinte et libellé d'un type de notification (repli neutre si inconnu). */
export function notificationMeta(type: string): NotificationMeta {
  return isNotificationType(type) ? META[type] : FALLBACK
}

const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

/**
 * Date relative courte en français : "à l'instant", "il y a 5 min", "il y a 3 h",
 * "hier", "il y a 4 j", puis la date complète au-delà d'une semaine.
 */
export function formatRelativeDate(value: Date | string, now: Date = new Date()): string {
  const date = new Date(value)
  const diff = now.getTime() - date.getTime()

  if (diff < MINUTE) return "à l'instant"
  if (diff < HOUR) return `il y a ${Math.floor(diff / MINUTE)} min`
  if (diff < DAY) return `il y a ${Math.floor(diff / HOUR)} h`
  if (diff < 2 * DAY) return "hier"
  if (diff < 7 * DAY) return `il y a ${Math.floor(diff / DAY)} j`

  return date.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })
}

export interface ReadableItem {
  read: boolean
  createdAt: Date | string
}

/** Sépare non lues / lues, chaque groupe trié de la plus récente à la plus ancienne. */
export function groupByReadState<T extends ReadableItem>(items: T[]): { unread: T[]; read: T[] } {
  const byDateDesc = (a: T, b: T) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()

  return {
    unread: items.filter((n) => !n.read).sort(byDateDesc),
    read: items.filter((n) => n.read).sort(byDateDesc),
  }
}
