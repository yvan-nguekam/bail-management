import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const profileSelect = {
  id: true,
  name: true,
  email: true,
  phone: true,
  role: true,
  avatar: true,
  createdAt: true,
} as const;

const profileSchema = z.object({
  name: z.string().trim().min(1, "Le nom est requis").max(100, "100 caractères maximum"),
  phone: z
    .string()
    .trim()
    .max(30, "30 caractères maximum")
    .optional()
    .or(z.literal("")),
});

// GET /api/users/me - Profil de l'utilisateur connecté
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: profileSelect,
    });

    if (!user) {
      return NextResponse.json({ error: "Utilisateur non trouvé" }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error("Erreur:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// PUT /api/users/me - Mise à jour du nom et du téléphone (l'email reste en lecture seule)
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const parsed = profileSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Données invalides", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const user = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        name: parsed.data.name,
        phone: parsed.data.phone ? parsed.data.phone : null,
      },
      select: profileSelect,
    });

    await prisma.activity.create({
      data: {
        userId: session.user.id,
        action: "UPDATE_PROFILE",
        entityType: "USER",
        entityId: session.user.id,
        details: "Profil mis à jour",
      },
    });

    return NextResponse.json(user);
  } catch (error) {
    console.error("Erreur:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
