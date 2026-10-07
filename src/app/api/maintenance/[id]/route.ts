import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import {
  canDeleteRequest,
  canManageProperty,
  canTransitionStatus,
  computeResolvedAt,
  maintenanceStatusLabels,
} from "@/lib/maintenance";

const updateMaintenanceSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  status: z.enum(["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED", "CANCELLED"]).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  category: z.string().optional(),
  assignedToId: z.string().nullable().optional(),
  scheduledDate: z.string().datetime().optional().nullable(),
  completedDate: z.string().datetime().optional().nullable(),
  cost: z.number().nonnegative().optional().nullable(),
});

// GET /api/maintenance/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const maintenanceRequest = await prisma.maintenanceRequest.findUnique({
      where: { id },
      include: {
        property: {
          include: {
            owner: {
              select: { id: true, name: true, email: true },
            },
            manager: {
              select: { id: true, name: true, email: true },
            },
          },
        },
        tenant: {
          select: { id: true, name: true, email: true, phone: true },
        },
        assignedTo: {
          select: { id: true, name: true, email: true, phone: true },
        },
        comments: {
          include: {
            author: {
              select: { id: true, name: true, email: true },
            },
          },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!maintenanceRequest) {
      return NextResponse.json({ error: "Demande non trouvée" }, { status: 404 });
    }

    // Vérifier les permissions
    const canView =
      session.user.role === "ADMIN" ||
      maintenanceRequest.property.ownerId === session.user.id ||
      maintenanceRequest.property.managerId === session.user.id ||
      maintenanceRequest.tenantId === session.user.id ||
      maintenanceRequest.assignedToId === session.user.id;

    if (!canView) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    }

    return NextResponse.json(maintenanceRequest);
  } catch (error) {
    console.error("Erreur:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// PUT /api/maintenance/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const existing = await prisma.maintenanceRequest.findUnique({
      where: { id },
      include: { property: true, tenant: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Demande non trouvée" }, { status: 404 });
    }

    if (!canManageProperty(session.user, existing.property)) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = updateMaintenanceSchema.parse(body);

    // Refuser les transitions de statut incohérentes (ex. CLOSED -> RESOLVED)
    if (
      validatedData.status &&
      !canTransitionStatus(existing.status, validatedData.status)
    ) {
      return NextResponse.json(
        {
          error: `Transition impossible : ${maintenanceStatusLabels[existing.status]} → ${maintenanceStatusLabels[validatedData.status]}`,
        },
        { status: 400 }
      );
    }

    // L'intervenant assigné doit exister et ne pas être un locataire
    if (validatedData.assignedToId) {
      const assignee = await prisma.user.findUnique({
        where: { id: validatedData.assignedToId },
        select: { role: true },
      });
      if (!assignee || assignee.role === "TENANT") {
        return NextResponse.json(
          { error: "Intervenant invalide" },
          { status: 400 }
        );
      }
    }

    const { scheduledDate, completedDate, ...rest } = validatedData;
    const updateData: Prisma.MaintenanceRequestUncheckedUpdateInput = { ...rest };
    if (scheduledDate !== undefined) {
      updateData.scheduledDate = scheduledDate ? new Date(scheduledDate) : null;
    }
    if (completedDate !== undefined) {
      updateData.resolvedAt = completedDate ? new Date(completedDate) : null;
    } else if (rest.status && rest.status !== existing.status) {
      // Date de résolution posée à la résolution, effacée en cas de réouverture/annulation
      updateData.resolvedAt = computeResolvedAt(rest.status, existing.resolvedAt);
    }

    const updated = await prisma.maintenanceRequest.update({
      where: { id },
      data: updateData,
      include: {
        property: { select: { id: true, name: true } },
        tenant: { select: { id: true, name: true } },
      },
    });

    // Notification au demandeur si changement de statut
    if (
      validatedData.status &&
      validatedData.status !== existing.status &&
      existing.tenantId !== session.user.id
    ) {
      await prisma.notification.create({
        data: {
          userId: existing.tenantId,
          type: "MAINTENANCE_UPDATE",
          title: "Mise à jour demande de maintenance",
          message: `Votre demande "${existing.title}" est maintenant : ${maintenanceStatusLabels[validatedData.status]}`,
          relatedId: updated.id,
          link: `/maintenance/${updated.id}`,
        },
      });
    }

    // Notification au nouvel intervenant assigné
    if (
      validatedData.assignedToId &&
      validatedData.assignedToId !== existing.assignedToId &&
      validatedData.assignedToId !== session.user.id
    ) {
      await prisma.notification.create({
        data: {
          userId: validatedData.assignedToId,
          type: "MAINTENANCE_UPDATE",
          title: "Demande de maintenance assignée",
          message: `La demande "${existing.title}" vous a été assignée`,
          relatedId: updated.id,
          link: `/maintenance/${updated.id}`,
        },
      });
    }

    await prisma.activity.create({
      data: {
        userId: session.user.id,
        action: "UPDATE_MAINTENANCE_REQUEST",
        entityType: "MAINTENANCE_REQUEST",
        entityId: updated.id,
        details: `Demande mise à jour: ${updated.title}`,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Données invalides", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Erreur:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// DELETE /api/maintenance/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const existing = await prisma.maintenanceRequest.findUnique({
      where: { id },
      include: { property: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Demande non trouvée" }, { status: 404 });
    }

    // Admin / propriétaire / gestionnaire : toujours.
    // Demandeur : seulement tant que la demande n'a pas été prise en charge (OPEN).
    if (!canDeleteRequest(session.user, existing)) {
      return NextResponse.json(
        {
          error:
            existing.tenantId === session.user.id
              ? "Une demande déjà prise en charge ne peut plus être supprimée"
              : "Non autorisé",
        },
        { status: 403 }
      );
    }

    await prisma.maintenanceRequest.delete({
      where: { id },
    });

    await prisma.activity.create({
      data: {
        userId: session.user.id,
        action: "DELETE_MAINTENANCE_REQUEST",
        entityType: "MAINTENANCE_REQUEST",
        entityId: id,
        details: `Demande supprimée: ${existing.title}`,
      },
    });

    return NextResponse.json({ message: "Demande supprimée" });
  } catch (error) {
    console.error("Erreur:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
