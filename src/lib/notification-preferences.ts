// Logique pure des préférences e-mail (catégories, décision d'envoi, objets, liens absolus).
// Aucune dépendance à Prisma/Next ici pour rester testable unitairement.

import { z } from "zod"
import type { NotificationTypeValue } from "@/lib/notifications"

export const EMAIL_CATEGORIES = ["payments", "leases", "maintenance", "messages"] as const
export type EmailCategory = (typeof EMAIL_CATEGORIES)[number]

/** Préférences stockées sur l'utilisateur (colonnes `users.email*`). */
export interface EmailPreferences {
  emailNotifications: boolean
  emailPayments: boolean
  emailLeases: boolean
  emailMaintenance: boolean
  emailMessages: boolean
}

export const DEFAULT_EMAIL_PREFERENCES: EmailPreferences = {
  emailNotifications: true,
  emailPayments: true,
  emailLeases: true,
  emailMaintenance: true,
  emailMessages: true,
}

/** Sélection Prisma des champs de préférences. */
export const emailPreferencesSelect = {
  emailNotifications: true,
  emailPayments: true,
  emailLeases: true,
  emailMaintenance: true,
  emailMessages: true,
} as const

export const CATEGORY_FIELD: Record<EmailCategory, keyof EmailPreferences> = {
  payments: "emailPayments",
  leases: "emailLeases",
  maintenance: "emailMaintenance",
  messages: "emailMessages",
}

export const EMAIL_CATEGORY_LABELS: Record<EmailCategory, { label: string; description: string }> = {
  payments: {
    label: "Paiements",
    description: "Loyers à venir ou en retard, paiements confirmés.",
  },
  leases: {
    label: "Baux et caution",
    description: "Création, activation, fin prochaine, expiration, résiliation, caution.",
  },
  maintenance: {
    label: "Maintenance",
    description: "Nouvelles demandes, changements de statut et commentaires.",
  },
  messages: {
    label: "Messages",
    description: "Nouveaux messages reçus dans la messagerie.",
  },
}

const TYPE_CATEGORY: Record<NotificationTypeValue, EmailCategory | null> = {
  PAYMENT_REMINDER: "payments",
  PAYMENT_RECEIVED: "payments",
  PAYMENT_DUE: "payments",
  LEASE_CREATED: "leases",
  LEASE_RENEWED: "leases",
  LEASE_TERMINATED: "leases",
  LEASE_EXPIRING: "leases",
  LEASE_EXPIRED: "leases",
  LEASE_ACTIVATED: "leases",
  DEPOSIT_RECEIVED: "leases",
  DEPOSIT_SETTLED: "leases",
  MAINTENANCE_REQUEST: "maintenance",
  MAINTENANCE_UPDATE: "maintenance",
  MESSAGE: "messages",
  // Messages système : seul l'interrupteur général s'applique
  SYSTEM: null,
}

/** Catégorie de préférence d'un type de notification (`null` : aucune catégorie dédiée). */
export function emailCategoryFor(type: NotificationTypeValue): EmailCategory | null {
  return TYPE_CATEGORY[type] ?? null
}

/** L'utilisateur accepte-t-il les e-mails pour ce type de notification ? */
export function shouldSendEmail(
  prefs: Partial<EmailPreferences> | null | undefined,
  type: NotificationTypeValue
): boolean {
  const resolved = { ...DEFAULT_EMAIL_PREFERENCES, ...prefs }
  if (!resolved.emailNotifications) return false
  const category = emailCategoryFor(type)
  return category ? resolved[CATEGORY_FIELD[category]] : true
}

export const APP_NAME = "RentalManager"
const SUBJECT_MAX_LENGTH = 120

/** Objet d'e-mail : "Titre · détail", espaces normalisés, tronqué proprement. */
export function buildEmailSubject(title: string, detail?: string | null): string {
  const clean = (value: string) => value.replace(/\s+/g, " ").trim()
  const parts = [clean(title), detail ? clean(detail) : ""].filter(Boolean)
  const subject = parts.length > 0 ? parts.join(" · ") : APP_NAME
  return subject.length > SUBJECT_MAX_LENGTH
    ? `${subject.slice(0, SUBJECT_MAX_LENGTH - 1).trimEnd()}…`
    : subject
}

/** URL publique de l'application (APP_URL, sinon NEXTAUTH_URL), sans "/" final. */
export function appBaseUrl(env: Record<string, string | undefined> = process.env): string {
  const base = env.APP_URL || env.NEXTAUTH_URL || "http://localhost:3000"
  return base.replace(/\/+$/, "")
}

/** Lien absolu à partir d'un chemin de l'application ("/payments/123"). */
export function absoluteUrl(path = "/", env?: Record<string, string | undefined>): string {
  if (/^https?:\/\//i.test(path)) return path
  return `${appBaseUrl(env)}${path.startsWith("/") ? path : `/${path}`}`
}

/** Page des réglages de notifications (lien du pied de page des e-mails). */
export const NOTIFICATION_SETTINGS_PATH = "/settings?tab=notifications"

/** Corps accepté par PUT /api/users/me/notification-preferences (mise à jour partielle). */
export const emailPreferencesUpdateSchema = z
  .object({
    emailNotifications: z.boolean(),
    emailPayments: z.boolean(),
    emailLeases: z.boolean(),
    emailMaintenance: z.boolean(),
    emailMessages: z.boolean(),
  })
  .partial()
  .strict()
  .refine((value) => Object.keys(value).length > 0, "Aucune préférence fournie")
