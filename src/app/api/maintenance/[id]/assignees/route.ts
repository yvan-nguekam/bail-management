import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManageProperty } from "@/lib/maintenance";
import { staffAssigneeIds } from "@/lib/maintenance-assignees";

// GET /api/maintenance/[id]/assignees - Intervenants possibles : équipe du bien (+ l'admin appelant)
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

    const request = await prisma.maintenanceRequest.findUnique({
      where: { id },
      select: { property: { select: { ownerId: true, managerId: true } } },
    });

    if (!request) {
      return NextResponse.json({ error: "Demande non trouvée" }, { status: 404 });
    }

    if (!canManageProperty(session.user, request.property)) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    }

    const assignees = await prisma.user.findMany({
      where: { id: { in: staffAssigneeIds(request.property, session.user) } },
      select: { id: true, name: true, email: true, role: true },
      orderBy: { name: "asc" },
    });

    return NextResponse.json(assignees);
  } catch (error) {
    console.error("Erreur:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
