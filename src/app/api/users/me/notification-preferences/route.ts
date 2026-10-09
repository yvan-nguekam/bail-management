import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  emailPreferencesSelect,
  emailPreferencesUpdateSchema,
} from "@/lib/notification-preferences";

// GET /api/users/me/notification-preferences - Préférences e-mail de l'utilisateur connecté
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const preferences = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: emailPreferencesSelect,
    });
    if (!preferences) {
      return NextResponse.json({ error: "Utilisateur non trouvé" }, { status: 404 });
    }

    return NextResponse.json(preferences);
  } catch (error) {
    console.error("Erreur:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// PUT /api/users/me/notification-preferences - Mise à jour (partielle) des préférences e-mail
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const data = emailPreferencesUpdateSchema.parse(await request.json());

    const preferences = await prisma.user.update({
      where: { id: session.user.id },
      data,
      select: emailPreferencesSelect,
    });

    return NextResponse.json(preferences);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Données invalides", details: error.issues },
        { status: 400 }
      );
    }
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: "Corps de requête invalide" }, { status: 400 });
    }
    console.error("Erreur:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
