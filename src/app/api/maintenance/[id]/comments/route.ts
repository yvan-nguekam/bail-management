import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const commentSchema = z.object({
  content: z.string().min(1, "Le commentaire ne peut pas être vide"),
});

// POST /api/maintenance/[id]/comments - Ajouter un commentaire
export async function POST(
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
        property: true,
        tenant: true,
      },
    });

    if (!maintenanceRequest) {
      return NextResponse.json({ error: "Demande non trouvée" }, { status: 404 });
    }

    // Vérifier les permissions
    const canComment =
      session.user.role === "ADMIN" ||
      maintenanceRequest.property.ownerId === session.user.id ||
      maintenanceRequest.property.managerId === session.user.id ||
      maintenanceRequest.tenantId === session.user.id ||
      maintenanceRequest.assignedToId === session.user.id;

    if (!canComment) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    }

    const body = await request.json();
    const { content } = commentSchema.parse(body);

    const comment = await prisma.maintenanceComment.create({
      data: {
        maintenanceRequestId: params.id,
        userId: session.user.id,
        content,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Créer une notification pour le locataire (si le commentaire n'est pas du locataire)
    if (session.user.id !== maintenanceRequest.tenantId) {
      await prisma.notification.create({
        data: {
          userId: maintenanceRequest.tenantId,
          type: "MAINTENANCE_UPDATE",
          title: "Nouveau commentaire",
          message: `${session.user.name} a commenté votre demande: ${maintenanceRequest.title}`,
          relatedId: maintenanceRequest.id,
        },
      });
    }

    return NextResponse.json(comment, { status: 201 });
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
