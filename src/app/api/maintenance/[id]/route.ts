import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateMaintenanceSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  status: z.enum(["PENDING", "IN_PROGRESS", "COMPLETED", "CANCELLED"]).optional(),
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
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const maintenanceRequest = await prisma.maintenanceRequest.findUnique({
      where: { id: params.id },
      include: {
        property: {
          include: {
            owner: {
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
            user: {
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
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const existing = await prisma.maintenanceRequest.findUnique({
      where: { id: params.id },
      include: { property: true, tenant: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Demande non trouvée" }, { status: 404 });
    }

    const canEdit =
      session.user.role === "ADMIN" ||
      existing.property.ownerId === session.user.id ||
      existing.property.managerId === session.user.id;

    if (!canEdit) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = updateMaintenanceSchema.parse(body);

    const updateData: any = { ...validatedData };
    if (validatedData.scheduledDate) {
      updateData.scheduledDate = new Date(validatedData.scheduledDate);
    }
    if (validatedData.completedDate) {
      updateData.completedDate = new Date(validatedData.completedDate);
    }

    const updated = await prisma.maintenanceRequest.update({
      where: { id: params.id },
      data: updateData,
      include: {
        property: { select: { id: true, name: true } },
        tenant: { select: { id: true, name: true } },
      },
    });

    // Notification si changement de statut
    if (validatedData.status && validatedData.status !== existing.status) {
      await prisma.notification.create({
        data: {
          userId: existing.tenantId,
          type: "MAINTENANCE_UPDATE",
          title: "Mise à jour demande de maintenance",
          message: `Votre demande "${existing.title}" est maintenant: ${validatedData.status}`,
          relatedId: updated.id,
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
        { error: "Données invalides", details: error.errors },
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
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const existing = await prisma.maintenanceRequest.findUnique({
      where: { id: params.id },
      include: { property: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Demande non trouvée" }, { status: 404 });
    }

    const canDelete =
      session.user.role === "ADMIN" ||
      existing.property.ownerId === session.user.id ||
      existing.tenantId === session.user.id;

    if (!canDelete) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    }

    await prisma.maintenanceRequest.delete({
      where: { id: params.id },
    });

    await prisma.activity.create({
      data: {
        userId: session.user.id,
        action: "DELETE_MAINTENANCE_REQUEST",
        entityType: "MAINTENANCE_REQUEST",
        entityId: params.id,
        details: `Demande supprimée: ${existing.title}`,
      },
    });

    return NextResponse.json({ message: "Demande supprimée" });
  } catch (error) {
    console.error("Erreur:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
