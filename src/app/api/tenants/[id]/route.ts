import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { summarizeTenant, tenantLeaseScope } from "@/lib/tenants";

// GET /api/tenants/[id] - Fiche d'un locataire et ses baux dans le périmètre
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const scope = tenantLeaseScope(session.user);
    if (!scope) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    }

    const { id } = await params;

    // Un utilisateur sans bail dans le périmètre est traité comme inexistant
    const tenant = await prisma.user.findFirst({
      where: { id, leases: { some: scope } },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        avatar: true,
        createdAt: true,
        leases: {
          where: scope,
          select: {
            id: true,
            status: true,
            startDate: true,
            endDate: true,
            monthlyRent: true,
            securityDeposit: true,
            paymentDay: true,
            property: {
              select: { id: true, name: true, address: true, city: true },
            },
            payments: {
              select: {
                id: true,
                amount: true,
                status: true,
                dueDate: true,
                paidDate: true,
                periodStart: true,
                periodEnd: true,
                paymentMethod: true,
              },
              orderBy: { dueDate: "desc" },
            },
          },
          orderBy: { startDate: "desc" },
        },
      },
    });

    if (!tenant) {
      return NextResponse.json(
        { error: "Locataire non trouvé" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      tenant,
      summary: summarizeTenant(tenant.leases),
    });
  } catch (error) {
    console.error("Erreur lors de la récupération du locataire:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
