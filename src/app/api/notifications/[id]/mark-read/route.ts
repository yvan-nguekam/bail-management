import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// POST /api/notifications/[id]/mark-read
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const notification = await prisma.notification.findUnique({
      where: { id },
      select: { id: true, userId: true, read: true },
    });

    if (!notification) {
      return NextResponse.json({ error: "Notification non trouvée" }, { status: 404 });
    }

    if (notification.userId !== session.user.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    }

    // Idempotent : on ne réécrit pas readAt si déjà lue
    const updated = notification.read
      ? await prisma.notification.findUniqueOrThrow({ where: { id } })
      : await prisma.notification.update({
          where: { id },
          data: { read: true, readAt: new Date() },
        });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Erreur:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
