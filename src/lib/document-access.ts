import type { PrismaClient } from "@prisma/client"

// Droits de rattachement d'un document à un bien et/ou un bail.
// Partagé par POST /api/documents (ajout par lien) et la route d'envoi Uploadthing "document".

export type DocumentAccessDb = Pick<PrismaClient, "property" | "lease">

interface AccessUser {
  id: string
  role: string
}

export interface DocumentTarget {
  propertyId?: string | null
  leaseId?: string | null
}

export type DocumentAccessResult = { ok: true } | { ok: false; status: 403; error: string }

/**
 * - ADMIN : tout bien / bail.
 * - Bien : propriétaire ou gestionnaire.
 * - Bail : locataire du bail, propriétaire ou gestionnaire du bien loué.
 * Un bien / bail inexistant est refusé (403, sans révéler son existence).
 */
export async function checkDocumentTargetAccess(
  db: DocumentAccessDb,
  user: AccessUser,
  target: DocumentTarget
): Promise<DocumentAccessResult> {
  if (user.role === "ADMIN") return { ok: true }

  if (target.propertyId) {
    const property = await db.property.findUnique({
      where: { id: target.propertyId },
      select: { ownerId: true, managerId: true },
    })
    if (!property || (property.ownerId !== user.id && property.managerId !== user.id)) {
      return { ok: false, status: 403, error: "Non autorisé pour cette propriété" }
    }
  }

  if (target.leaseId) {
    const lease = await db.lease.findUnique({
      where: { id: target.leaseId },
      select: { tenantId: true, property: { select: { ownerId: true, managerId: true } } },
    })
    if (
      !lease ||
      (lease.tenantId !== user.id &&
        lease.property.ownerId !== user.id &&
        lease.property.managerId !== user.id)
    ) {
      return { ok: false, status: 403, error: "Non autorisé pour ce bail" }
    }
  }

  return { ok: true }
}
