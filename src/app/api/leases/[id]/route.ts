import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

// Schema de validation pour mise à jour
const updateLeaseSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  monthlyRent: z.number().positive().optional(),
  securityDeposit: z.number().nonnegative().optional(),
  terms: z.string().optional(),
  status: z.enum(["DRAFT", "ACTIVE", "EXPIRED", "TERMINATED", "RENEWED"]).optional(),
});

// GET /api/leases/[id] - Récupère un bail par ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: "Non authentifié" },
        { status: 401 }
      );
    }

    const lease = await prisma.lease.findUnique({
      where: { id: params.id },
      include: {
        property: {
          include: {
            owner: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
              },
            },
            manager: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
              },
            },
          },
        },
        tenant: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        payments: {
          orderBy: {
            dueDate: "desc",
          },
        },
        documents: {
          orderBy: {
            uploadedAt: "desc",
          },
        },
      },
    });

    if (!lease) {
      return NextResponse.json(
        { error: "Bail non trouvé" },
        { status: 404 }
      );
    }

    // Vérifier les permissions
    const canView =
      session.user.role === "ADMIN" ||
      lease.property.ownerId === session.user.id ||
      lease.property.managerId === session.user.id ||
      lease.tenantId === session.user.id;

    if (!canView) {
      return NextResponse.json(
        { error: "Non autorisé" },
        { status: 403 }
      );
    }

    return NextResponse.json(lease);
  } catch (error) {
    console.error("Erreur lors de la récupération du bail:", error);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}

// PUT /api/leases/[id] - Met à jour un bail
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: "Non authentifié" },
        { status: 401 }
      );
    }

    // Vérifier que le bail existe
    const existingLease = await prisma.lease.findUnique({
      where: { id: params.id },
      include: {
        property: true,
      },
    });

    if (!existingLease) {
      return NextResponse.json(
        { error: "Bail non trouvé" },
        { status: 404 }
      );
    }

    // Vérifier les permissions
    const canEdit =
      session.user.role === "ADMIN" ||
      existingLease.property.ownerId === session.user.id ||
      existingLease.property.managerId === session.user.id;

    if (!canEdit) {
      return NextResponse.json(
        { error: "Non autorisé" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validatedData = updateLeaseSchema.parse(body);

    // Convertir les dates si présentes
    const updateData: any = { ...validatedData };
    if (validatedData.startDate) {
      updateData.startDate = new Date(validatedData.startDate);
    }
    if (validatedData.endDate) {
      updateData.endDate = new Date(validatedData.endDate);
    }

    // Vérifier que la date de fin est après la date de début
    const startDate = updateData.startDate || existingLease.startDate;
    const endDate = updateData.endDate || existingLease.endDate;

    if (endDate <= startDate) {
      return NextResponse.json(
        { error: "La date de fin doit être après la date de début" },
        { status: 400 }
      );
    }

    const lease = await prisma.lease.update({
      where: { id: params.id },
      data: updateData,
      include: {
        property: {
          select: {
            id: true,
            name: true,
            address: true,
            city: true,
          },
        },
        tenant: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Si le statut change vers TERMINATED ou EXPIRED, mettre à jour la propriété
    if (
      validatedData.status &&
      ["TERMINATED", "EXPIRED"].includes(validatedData.status) &&
      existingLease.status === "ACTIVE"
    ) {
      await prisma.property.update({
        where: { id: lease.propertyId },
        data: { status: "AVAILABLE" },
      });
    }

    // Créer une entrée d'activité
    await prisma.activity.create({
      data: {
        userId: session.user.id,
        action: "UPDATE_LEASE",
        entityType: "LEASE",
        entityId: lease.id,
        details: `Bail mis à jour pour ${existingLease.property.name}`,
      },
    });

    return NextResponse.json(lease);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Données invalides", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Erreur lors de la mise à jour du bail:", error);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}

// DELETE /api/leases/[id] - Supprime un bail
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: "Non authentifié" },
        { status: 401 }
      );
    }

    // Vérifier que le bail existe
    const existingLease = await prisma.lease.findUnique({
      where: { id: params.id },
      include: {
        property: true,
        payments: true,
      },
    });

    if (!existingLease) {
      return NextResponse.json(
        { error: "Bail non trouvé" },
        { status: 404 }
      );
    }

    // Vérifier les permissions (seul l'admin ou le propriétaire peut supprimer)
    const canDelete =
      session.user.role === "ADMIN" ||
      existingLease.property.ownerId === session.user.id;

    if (!canDelete) {
      return NextResponse.json(
        { error: "Non autorisé" },
        { status: 403 }
      );
    }

    // Empêcher la suppression si le bail est actif
    if (existingLease.status === "ACTIVE") {
      return NextResponse.json(
        {
          error:
            "Impossible de supprimer un bail actif. Veuillez le résilier d'abord.",
        },
        { status: 400 }
      );
    }

    // Empêcher la suppression s'il y a des paiements
    if (existingLease.payments.length > 0) {
      return NextResponse.json(
        {
          error:
            "Impossible de supprimer un bail avec des paiements associés",
        },
        { status: 400 }
      );
    }

    await prisma.lease.delete({
      where: { id: params.id },
    });

    // Créer une entrée d'activité
    await prisma.activity.create({
      data: {
        userId: session.user.id,
        action: "DELETE_LEASE",
        entityType: "LEASE",
        entityId: params.id,
        details: `Bail supprimé pour ${existingLease.property.name}`,
      },
    });

    return NextResponse.json({ message: "Bail supprimé avec succès" });
  } catch (error) {
    console.error("Erreur lors de la suppression du bail:", error);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}
