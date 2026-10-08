import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma, UserRole } from "@prisma/client";

// GET /api/users - Liste des utilisateurs (pour sélection de locataires)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: "Non authentifié" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const role = searchParams.get("role");

    // Seuls les ADMIN, LANDLORD et MANAGER peuvent lister les utilisateurs
    if (!["ADMIN", "LANDLORD", "MANAGER"].includes(session.user.role)) {
      return NextResponse.json(
        { error: "Non autorisé" },
        { status: 403 }
      );
    }

    const where: Prisma.UserWhereInput = {};

    if (session.user.role !== "ADMIN") {
      // Bailleurs et gestionnaires ne peuvent lister que des locataires
      // (sélecteur du formulaire de bail), jamais les autres comptes
      where.role = "TENANT";
    } else if (role && (Object.values(UserRole) as string[]).includes(role)) {
      where.role = role as UserRole;
    }

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        createdAt: true,
      },
      orderBy: {
        name: "asc",
      },
    });

    return NextResponse.json(users);
  } catch (error) {
    console.error("Erreur lors de la récupération des utilisateurs:", error);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}
