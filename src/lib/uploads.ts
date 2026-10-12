import type { PrismaClient } from "@prisma/client"
import { z } from "zod"
import { DOCUMENT_TYPES } from "@/lib/documents"
import { checkDocumentTargetAccess } from "@/lib/document-access"
import {
  MAX_MAINTENANCE_IMAGES,
  MAX_PROPERTY_IMAGES,
  uploadthingKeyFromUrl,
} from "@/lib/upload-config"

// Logique métier des routes d'envoi Uploadthing (src/app/api/uploadthing/core.ts) :
// contrôle d'accès (".middleware") et écritures en base (".onUploadComplete").
// La base est injectée et aucune dépendance à Uploadthing / Next ici : testable avec une fausse base.

export type UploadDb = Pick<
  PrismaClient,
  "property" | "lease" | "document" | "activity" | "maintenanceRequest" | "maintenanceComment" | "user"
>

export type UploadErrorCode = "UNAUTHORIZED" | "FORBIDDEN" | "NOT_FOUND" | "BAD_REQUEST"

/** Refus d'envoi ; converti en UploadThingError (message renvoyé tel quel au client). */
export class UploadAccessError extends Error {
  constructor(
    public readonly code: UploadErrorCode,
    message: string
  ) {
    super(message)
    this.name = "UploadAccessError"
  }
}

export interface UploadSession {
  user?: { id?: string | null; role?: string | null } | null
}

export interface UploadUser {
  id: string
  role: string
}

/** Fichier tel que renvoyé par Uploadthing à la fin de l'envoi. */
export interface UploadedFile {
  name: string
  size: number
  type: string
  key: string
  ufsUrl: string
}

export function requireUploadUser(session: UploadSession | null | undefined): UploadUser {
  const id = session?.user?.id
  const role = session?.user?.role
  if (!id || !role) throw new UploadAccessError("UNAUTHORIZED", "Non authentifié")
  return { id, role }
}

const id = z.string().trim().min(1)

// ---------------------------------------------------------------------------
// Photos d'un bien
// ---------------------------------------------------------------------------

export const propertyImageInput = z.object({ propertyId: id })

export async function authorizePropertyImageUpload(
  db: UploadDb,
  session: UploadSession | null,
  input: z.infer<typeof propertyImageInput>,
  fileCount: number
) {
  const user = requireUploadUser(session)
  const property = await db.property.findUnique({
    where: { id: input.propertyId },
    select: { ownerId: true, managerId: true, images: true },
  })
  if (!property) throw new UploadAccessError("NOT_FOUND", "Bien introuvable")
  if (user.role !== "ADMIN" && property.ownerId !== user.id && property.managerId !== user.id) {
    throw new UploadAccessError("FORBIDDEN", "Vous ne pouvez pas ajouter de photos à ce bien")
  }
  if (property.images.length + fileCount > MAX_PROPERTY_IMAGES) {
    throw new UploadAccessError(
      "BAD_REQUEST",
      `${MAX_PROPERTY_IMAGES} photos maximum par bien (${property.images.length} déjà en ligne)`
    )
  }
  return { userId: user.id, propertyId: input.propertyId }
}

export async function savePropertyImage(
  db: UploadDb,
  metadata: { userId: string; propertyId: string },
  file: UploadedFile
) {
  await db.property.update({
    where: { id: metadata.propertyId },
    data: { images: { push: file.ufsUrl }, imageKeys: { push: file.key } },
  })
  return { url: file.ufsUrl }
}

// ---------------------------------------------------------------------------
// Documents
// ---------------------------------------------------------------------------

export const documentUploadInput = z.object({
  name: z.string().trim().max(150, "150 caractères maximum").optional(),
  type: z.enum(DOCUMENT_TYPES),
  propertyId: id.optional(),
  leaseId: id.optional(),
})

export async function authorizeDocumentUpload(
  db: UploadDb,
  session: UploadSession | null,
  input: z.infer<typeof documentUploadInput>
) {
  const user = requireUploadUser(session)
  const access = await checkDocumentTargetAccess(db, user, input)
  if (!access.ok) throw new UploadAccessError("FORBIDDEN", access.error)
  return {
    userId: user.id,
    name: input.name?.trim() || null,
    type: input.type,
    propertyId: input.propertyId ?? null,
    leaseId: input.leaseId ?? null,
  }
}

export async function saveUploadedDocument(
  db: UploadDb,
  metadata: Awaited<ReturnType<typeof authorizeDocumentUpload>>,
  file: UploadedFile
) {
  const document = await db.document.create({
    data: {
      name: metadata.name || file.name,
      type: metadata.type,
      url: file.ufsUrl,
      fileKey: file.key,
      size: file.size,
      mimeType: file.type || "application/octet-stream",
      propertyId: metadata.propertyId,
      leaseId: metadata.leaseId,
      uploadedById: metadata.userId,
    },
    select: { id: true, name: true },
  })

  await db.activity.create({
    data: {
      userId: metadata.userId,
      action: "CREATE_DOCUMENT",
      entityType: "DOCUMENT",
      entityId: document.id,
      details: `Document téléversé : ${document.name}`,
    },
  })

  return { documentId: document.id }
}

// ---------------------------------------------------------------------------
// Photos d'une demande d'intervention (ou d'un commentaire)
// ---------------------------------------------------------------------------

export const maintenanceImageInput = z.object({
  requestId: id,
  commentId: id.optional(),
})

export async function authorizeMaintenanceImageUpload(
  db: UploadDb,
  session: UploadSession | null,
  input: z.infer<typeof maintenanceImageInput>,
  fileCount: number
) {
  const user = requireUploadUser(session)
  const request = await db.maintenanceRequest.findUnique({
    where: { id: input.requestId },
    select: {
      tenantId: true,
      assignedToId: true,
      images: true,
      property: { select: { ownerId: true, managerId: true } },
    },
  })
  if (!request) throw new UploadAccessError("NOT_FOUND", "Demande introuvable")

  // Mêmes participants que le fil de commentaires
  const isParticipant =
    user.role === "ADMIN" ||
    request.tenantId === user.id ||
    request.assignedToId === user.id ||
    request.property.ownerId === user.id ||
    request.property.managerId === user.id
  if (!isParticipant) {
    throw new UploadAccessError("FORBIDDEN", "Vous ne participez pas à cette demande")
  }

  let currentCount = request.images.length
  if (input.commentId) {
    const comment = await db.maintenanceComment.findUnique({
      where: { id: input.commentId },
      select: { requestId: true, authorId: true, images: true },
    })
    if (!comment || comment.requestId !== input.requestId) {
      throw new UploadAccessError("NOT_FOUND", "Commentaire introuvable")
    }
    if (comment.authorId !== user.id) {
      throw new UploadAccessError(
        "FORBIDDEN",
        "Seul l'auteur du commentaire peut y joindre des photos"
      )
    }
    currentCount = comment.images.length
  }

  if (currentCount + fileCount > MAX_MAINTENANCE_IMAGES) {
    throw new UploadAccessError("BAD_REQUEST", `${MAX_MAINTENANCE_IMAGES} photos maximum`)
  }

  return { userId: user.id, requestId: input.requestId, commentId: input.commentId ?? null }
}

export async function saveMaintenanceImage(
  db: UploadDb,
  metadata: Awaited<ReturnType<typeof authorizeMaintenanceImageUpload>>,
  file: UploadedFile
) {
  if (metadata.commentId) {
    await db.maintenanceComment.update({
      where: { id: metadata.commentId },
      data: { images: { push: file.ufsUrl } },
    })
  } else {
    await db.maintenanceRequest.update({
      where: { id: metadata.requestId },
      data: { images: { push: file.ufsUrl } },
    })
  }
  return { url: file.ufsUrl }
}

// ---------------------------------------------------------------------------
// Photo de profil
// ---------------------------------------------------------------------------

export function authorizeAvatarUpload(session: UploadSession | null) {
  const user = requireUploadUser(session)
  return { userId: user.id }
}

/** Enregistre la nouvelle photo et renvoie la clé de l'ancienne (à supprimer chez Uploadthing). */
export async function saveAvatar(db: UploadDb, metadata: { userId: string }, file: UploadedFile) {
  const previous = await db.user.findUnique({
    where: { id: metadata.userId },
    select: { avatar: true },
  })
  await db.user.update({ where: { id: metadata.userId }, data: { avatar: file.ufsUrl } })
  const previousKey = previous?.avatar ? uploadthingKeyFromUrl(previous.avatar) : null
  return { url: file.ufsUrl, previousKey: previousKey !== file.key ? previousKey : null }
}
