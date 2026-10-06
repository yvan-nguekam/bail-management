import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { syncLeaseSchedule } from "@/lib/lease-schedule";

// POST /api/leases/[id]/schedule - (Re)génère l'échéancier des loyers du bail
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: "Non authentifié" },
        { status: 401 }
      );
    }

    const lease = await prisma.lease.findUnique({
      where: { id },
      include: { property: true },
    });

    if (!lease) {
      return NextResponse.json(
        { error: "Bail non trouvé" },
        { status: 404 }
      );
    }

    const canManage =
      session.user.role === "ADMIN" ||
      lease.property.ownerId === session.user.id ||
      lease.property.managerId === session.user.id;

    if (!canManage) {
      return NextResponse.json(
        { error: "Non autorisé" },
        { status: 403 }
      );
    }

    // Un bail renouvelé est remplacé par le nouveau bail : son échéancier est figé
    if (lease.status === "RENEWED") {
      return NextResponse.json(
        { error: "L'échéancier d'un bail renouvelé ne peut plus être modifié" },
        { status: 400 }
      );
    }

    const result = await prisma.$transaction((tx) => syncLeaseSchedule(tx, lease));

    await prisma.activity.create({
      data: {
        userId: session.user.id,
        action: "SYNC_LEASE_SCHEDULE",
        entityType: "LEASE",
        entityId: lease.id,
        details: `Échéancier régénéré pour ${lease.property.name} (${result.created} échéance(s) créée(s), ${result.deleted} supprimée(s))`,
      },
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Erreur lors de la génération de l'échéancier:", error);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}
