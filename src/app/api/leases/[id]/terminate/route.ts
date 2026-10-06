import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const terminateSchema = z.object({
  terminationDate: z.string().datetime(),
  reason: z.string().optional(),
});

// POST /api/leases/[id]/terminate - Résilier un bail
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: "Non authentifié" },
        { status: 401 }
      );
    }

    const lease = await prisma.lease.findUnique({
      where: { id },
      include: {
        property: true,
        tenant: {
          select: {
            id: true,
            name: true,
            email: true,
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
    const canTerminate =
      session.user.role === "ADMIN" ||
      lease.property.ownerId === session.user.id ||
      lease.property.managerId === session.user.id;

    if (!canTerminate) {
      return NextResponse.json(
        { error: "Non autorisé" },
        { status: 403 }
      );
    }

    // Vérifier que le bail est actif
    if (lease.status !== "ACTIVE") {
      return NextResponse.json(
        { error: "Seuls les baux actifs peuvent être résiliés" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { terminationDate, reason } = terminateSchema.parse(body);

    const termDate = new Date(terminationDate);

    // Mettre à jour le bail
    const updatedLease = await prisma.lease.update({
      where: { id },
      data: {
        status: "TERMINATED",
        endDate: termDate,
        terms: reason
          ? `${lease.terms || ""}\n\nRésiliation: ${reason}`
          : lease.terms,
      },
      include: {
        property: {
          select: {
            id: true,
            name: true,
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

    // Mettre à jour le statut de la propriété
    await prisma.property.update({
      where: { id: lease.propertyId },
      data: { status: "AVAILABLE" },
    });

    // Créer une notification pour le locataire
    await prisma.notification.create({
      data: {
        userId: lease.tenantId,
        type: "LEASE_TERMINATED",
        title: "Résiliation de bail",
        message: `Votre bail pour ${lease.property.name} a été résilié`,
        relatedId: lease.id,
      },
    });

    // Créer une entrée d'activité
    await prisma.activity.create({
      data: {
        userId: session.user.id,
        action: "TERMINATE_LEASE",
        entityType: "LEASE",
        entityId: lease.id,
        details: `Bail résilié pour ${lease.property.name}`,
      },
    });

    return NextResponse.json(updatedLease);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Données invalides", details: error.issues },
        { status: 400 }
      );
    }

    console.error("Erreur lors de la résiliation du bail:", error);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}
