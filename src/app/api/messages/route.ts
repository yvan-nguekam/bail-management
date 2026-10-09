import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { notify } from "@/lib/notify";
import { absoluteUrl, buildEmailSubject } from "@/lib/notification-preferences";
import { NewMessageEmail } from "@/emails/new-message";
import { canMessageUser } from "@/lib/message-contacts";

const messageSchema = z.object({
  receiverId: z.string().min(1, "Le destinataire est requis"),
  subject: z.string().trim().min(1, "Le sujet est requis").max(150, "150 caractères maximum"),
  content: z.string().trim().min(1, "Le contenu est requis").max(5000, "5000 caractères maximum"),
});

// GET /api/messages - Messages envoyés et reçus par l'utilisateur
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const messages = await prisma.message.findMany({
      where: {
        OR: [
          { senderId: session.user.id },
          { receiverId: session.user.id },
        ],
      },
      include: {
        sender: {
          select: { id: true, name: true, email: true, role: true },
        },
        receiver: {
          select: { id: true, name: true, email: true, role: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const unreadCount = messages.filter(
      (m) => m.receiverId === session.user.id && !m.read
    ).length;

    return NextResponse.json({ messages, unreadCount });
  } catch (error) {
    console.error("Erreur:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// POST /api/messages - Envoyer un message
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = messageSchema.parse(body);

    const receiver = await prisma.user.findUnique({
      where: { id: validatedData.receiverId },
      select: { id: true },
    });

    if (!receiver) {
      return NextResponse.json({ error: "Destinataire non trouvé" }, { status: 404 });
    }

    // Le destinataire doit faire partie des contacts autorisés (jamais soi-même)
    if (!(await canMessageUser(session.user, validatedData.receiverId))) {
      return NextResponse.json(
        { error: "Vous ne pouvez pas écrire à cet utilisateur" },
        { status: 403 }
      );
    }

    const message = await prisma.message.create({
      data: {
        ...validatedData,
        senderId: session.user.id,
      },
      include: {
        sender: { select: { id: true, name: true, email: true, role: true } },
        receiver: { select: { id: true, name: true, email: true, role: true } },
      },
    });

    // Créer une notification pour le destinataire
    await notify({
      userId: validatedData.receiverId,
      type: "MESSAGE",
      title: "Nouveau message",
      message: `${session.user.name} : ${validatedData.subject}`,
      relatedId: message.id,
      link: `/messages/${message.id}`,
      email: {
        subject: buildEmailSubject(`Nouveau message de ${message.sender.name}`, validatedData.subject),
        react: (recipient) =>
          NewMessageEmail({
            recipientName: recipient.name,
            senderName: message.sender.name,
            subject: validatedData.subject,
            content: validatedData.content,
            messageUrl: absoluteUrl(`/messages/${message.id}`),
          }),
      },
    });

    return NextResponse.json(message, { status: 201 });
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
