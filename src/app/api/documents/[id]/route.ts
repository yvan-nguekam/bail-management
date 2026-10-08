import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canDeleteDocument } from "@/lib/documents";

// DELETE /api/documents/[id] - Auteur du dépôt, propriétaire / gestionnaire du bien, ou admin
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const document = await prisma.document.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        uploadedById: true,
        property: { select: { ownerId: true, managerId: true } },
        lease: { select: { property: { select: { ownerId: true, managerId: true } } } },
      },
    });

    if (!document) {
      return NextResponse.json({ error: "Document non trouvé" }, { status: 404 });
    }

    if (!canDeleteDocument(session.user, document)) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    }

    await prisma.document.delete({ where: { id } });

    await prisma.activity.create({
      data: {
        userId: session.user.id,
        action: "DELETE_DOCUMENT",
        entityType: "DOCUMENT",
        entityId: id,
        details: `Document supprimé : ${document.name}`,
      },
    });

    return NextResponse.json({ message: "Document supprimé" });
  } catch (error) {
    console.error("Erreur:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
