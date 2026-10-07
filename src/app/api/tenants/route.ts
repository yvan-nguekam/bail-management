import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { summarizeTenant, tenantLeaseScope, tenantWhere } from "@/lib/tenants";

const querySchema = z.object({
  search: z.string().max(100).optional(),
  status: z.enum(["all", "active", "former"]).default("all"),
});

// GET /api/tenants - Locataires ayant (eu) un bail sur les biens de l'utilisateur
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const scope = tenantLeaseScope(session.user);
    if (!scope) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const parsed = querySchema.safeParse({
      search: searchParams.get("search") ?? undefined,
      status: searchParams.get("status") ?? undefined,
    });
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Paramètres invalides", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const users = await prisma.user.findMany({
      where: tenantWhere(scope, parsed.data),
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        avatar: true,
        // Seuls les baux (et donc paiements) du périmètre sont agrégés
        leases: {
          where: scope,
          select: {
            id: true,
            status: true,
            startDate: true,
            endDate: true,
            monthlyRent: true,
            property: { select: { id: true, name: true } },
            payments: {
              select: { id: true, amount: true, status: true, dueDate: true },
            },
          },
        },
      },
      orderBy: { name: "asc" },
    });

    const now = new Date();
    const tenants = users.map(({ leases, ...user }) => ({
      ...user,
      ...summarizeTenant(leases, now),
    }));

    const stats = {
      total: tenants.length,
      withActiveLease: tenants.filter((t) => t.activeLease).length,
      totalOverdue: tenants.reduce((sum, t) => sum + t.overdueAmount, 0),
    };

    return NextResponse.json({ tenants, stats });
  } catch (error) {
    console.error("Erreur lors de la récupération des locataires:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
