import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { USER_ROLES, canChangeRole, userRoleLabel } from "@/lib/users";

const roleSchema = z.object({
  role: z.enum(USER_ROLES),
});

// PUT /api/users/[id] - Changement de rôle (ADMIN uniquement, jamais sur soi-même)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    }

    if (!canChangeRole(session.user, id)) {
      return NextResponse.json(
        { error: "Vous ne pouvez pas modifier votre propre rôle" },
        { status: 403 }
      );
    }

    const parsed = roleSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Rôle invalide", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const existing = await prisma.user.findUnique({
      where: { id },
      select: { id: true, name: true, role: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Utilisateur non trouvé" }, { status: 404 });
    }

    const user = await prisma.user.update({
      where: { id },
      data: { role: parsed.data.role },
      select: { id: true, name: true, email: true, phone: true, role: true, createdAt: true },
    });

    await prisma.activity.create({
      data: {
        userId: session.user.id,
        action: "UPDATE_USER_ROLE",
        entityType: "USER",
        entityId: id,
        details: `${existing.name} : ${userRoleLabel(existing.role)} → ${userRoleLabel(user.role)}`,
      },
    });

    return NextResponse.json(user);
  } catch (error) {
    console.error("Erreur:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
