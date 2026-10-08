import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isMessageParticipant } from "@/lib/messages";

const participantSelect = { id: true, name: true, email: true, role: true } as const;

// GET /api/messages/[id] - Détail d'un message (participants uniquement).
// Marque le message comme lu quand le destinataire l'ouvre.
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const message = await prisma.message.findUnique({
      where: { id },
      include: {
        sender: { select: participantSelect },
        receiver: { select: participantSelect },
      },
    });

    if (!message || !isMessageParticipant(session.user.id, message)) {
      // 404 dans les deux cas pour ne pas révéler l'existence du message
      return NextResponse.json({ error: "Message non trouvé" }, { status: 404 });
    }

    if (message.receiverId === session.user.id && !message.read) {
      const readAt = new Date();
      await prisma.message.update({
        where: { id },
        data: { read: true, readAt },
      });
      return NextResponse.json({ ...message, read: true, readAt });
    }

    return NextResponse.json(message);
  } catch (error) {
    console.error("Erreur:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// DELETE /api/messages/[id] - Suppression par l'un des participants
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

    const message = await prisma.message.findUnique({
      where: { id },
      select: { id: true, senderId: true, receiverId: true, subject: true },
    });

    if (!message || !isMessageParticipant(session.user.id, message)) {
      return NextResponse.json({ error: "Message non trouvé" }, { status: 404 });
    }

    await prisma.message.delete({ where: { id } });

    await prisma.activity.create({
      data: {
        userId: session.user.id,
        action: "DELETE_MESSAGE",
        entityType: "MESSAGE",
        entityId: id,
        details: `Message supprimé : ${message.subject}`,
      },
    });

    return NextResponse.json({ message: "Message supprimé" });
  } catch (error) {
    console.error("Erreur:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
