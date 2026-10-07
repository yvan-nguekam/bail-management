import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const commentSchema = z.object({
  content: z
    .string()
    .trim()
    .min(1, "Le commentaire ne peut pas être vide")
    .max(5000, "Le commentaire est trop long"),
});

type RequestWithParticipants = {
  tenantId: string;
  assignedToId: string | null;
  property: { ownerId: string; managerId: string | null };
};

// Participants : admin, propriétaire, gestionnaire, demandeur, intervenant assigné
function isParticipant(
  user: { id: string; role: string },
  request: RequestWithParticipants
) {
  return (
    user.role === "ADMIN" ||
    request.property.ownerId === user.id ||
    request.property.managerId === user.id ||
    request.tenantId === user.id ||
    request.assignedToId === user.id
  );
}

const commentInclude = {
  author: {
    select: {
      id: true,
      name: true,
      email: true,
    },
  },
} as const;

// GET /api/maintenance/[id]/comments - Lister les commentaires
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
      select: {
        tenantId: true,
        assignedToId: true,
        property: { select: { ownerId: true, managerId: true } },
      },
    });

    if (!maintenanceRequest) {
      return NextResponse.json({ error: "Demande non trouvée" }, { status: 404 });
    }

    if (!isParticipant(session.user, maintenanceRequest)) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    }

    const comments = await prisma.maintenanceComment.findMany({
      where: { requestId: id },
      include: commentInclude,
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json(comments);
  } catch (error) {
    console.error("Erreur:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// POST /api/maintenance/[id]/comments - Ajouter un commentaire
export async function POST(
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
        property: true,
      },
    });

    if (!maintenanceRequest) {
      return NextResponse.json({ error: "Demande non trouvée" }, { status: 404 });
    }

    if (!isParticipant(session.user, maintenanceRequest)) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    }

    const body = await request.json();
    const { content } = commentSchema.parse(body);

    const comment = await prisma.maintenanceComment.create({
      data: {
        requestId: id,
        authorId: session.user.id,
        authorName: session.user.name ?? "",
        authorRole: session.user.role,
        content,
      },
      include: commentInclude,
    });

    // Notifier tous les autres participants (avant : seul le locataire était notifié,
    // un commentaire du locataire n'alertait donc personne)
    const recipients = new Set(
      [
        maintenanceRequest.tenantId,
        maintenanceRequest.property.ownerId,
        maintenanceRequest.property.managerId,
        maintenanceRequest.assignedToId,
      ].filter((uid): uid is string => !!uid && uid !== session.user.id)
    );

    if (recipients.size > 0) {
      await prisma.notification.createMany({
        data: [...recipients].map((userId) => ({
          userId,
          type: "MAINTENANCE_UPDATE" as const,
          title: "Nouveau commentaire",
          message: `${session.user.name} a commenté la demande: ${maintenanceRequest.title}`,
          relatedId: maintenanceRequest.id,
          link: `/maintenance/${maintenanceRequest.id}`,
        })),
      });
    }

    return NextResponse.json(comment, { status: 201 });
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
