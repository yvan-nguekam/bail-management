import type { ReactElement } from "react"
import type { PrismaClient } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { sendEmail } from "@/lib/email"
import type { NotificationTypeValue } from "@/lib/notifications"
import { emailPreferencesSelect, shouldSendEmail } from "@/lib/notification-preferences"

// Point d'entrée unique des notifications : notification in-app (toujours) + e-mail
// (si le destinataire l'accepte). L'e-mail ne fait jamais échouer l'opération appelante.

export interface NotificationRecipient {
  id: string
  name: string
  email: string
}

export interface NotificationEmail {
  subject: string
  /** Template, ou fonction du destinataire pour personnaliser la salutation */
  react: ReactElement | ((recipient: NotificationRecipient) => ReactElement)
}

export interface NotifyInput {
  userId?: string | null
  userIds?: (string | null | undefined)[]
  type: NotificationTypeValue
  title: string
  message: string
  link?: string | null
  relatedId?: string | null
  email?: NotificationEmail
}

type NotifyDb = Pick<PrismaClient, "notification" | "user">

/** Destinataires uniques et non vides. */
export function recipientIds(input: Pick<NotifyInput, "userId" | "userIds">): string[] {
  return [...new Set([input.userId, ...(input.userIds ?? [])])].filter(
    (id): id is string => typeof id === "string" && id.length > 0
  )
}

/** Lignes `notification` à insérer (utilisable dans une transaction Prisma). */
export function buildNotificationRows(input: NotifyInput) {
  return recipientIds(input).map((userId) => ({
    userId,
    type: input.type,
    title: input.title,
    message: input.message,
    link: input.link ?? null,
    relatedId: input.relatedId ?? null,
  }))
}

/**
 * Envoie l'e-mail aux destinataires qui l'acceptent pour ce type de notification.
 * Ne lève jamais d'exception ; renvoie le nombre d'e-mails tentés.
 */
export async function sendNotificationEmails(
  db: Pick<PrismaClient, "user">,
  input: { userIds: string[]; type: NotificationTypeValue; email?: NotificationEmail }
): Promise<number> {
  const { userIds, type, email } = input
  if (!email || userIds.length === 0) return 0

  try {
    const users = await db.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, email: true, ...emailPreferencesSelect },
    })
    const recipients = users.filter((user) => user.email && shouldSendEmail(user, type))

    await Promise.allSettled(
      recipients.map((user) =>
        sendEmail({
          to: user.email,
          subject: email.subject,
          react: typeof email.react === "function" ? email.react(user) : email.react,
        })
      )
    )
    return recipients.length
  } catch (error) {
    console.error(`Notification e-mail (${type}) failed:`, error)
    return 0
  }
}

/**
 * Crée la ou les notifications in-app puis envoie l'e-mail associé selon les préférences.
 * Une erreur d'insertion est propagée (comme avant) ; une erreur d'e-mail est seulement journalisée.
 */
export async function notify(
  input: NotifyInput,
  db: NotifyDb = prisma
): Promise<{ notified: number; emailed: number }> {
  const data = buildNotificationRows(input)
  if (data.length === 0) return { notified: 0, emailed: 0 }

  await db.notification.createMany({ data })

  const emailed = await sendNotificationEmails(db, {
    userIds: data.map((row) => row.userId),
    type: input.type,
    email: input.email,
  })

  return { notified: data.length, emailed }
}
