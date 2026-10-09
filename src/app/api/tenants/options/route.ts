import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { tenantLeaseScope } from "@/lib/tenants";
import { pickerTenantWhere } from "@/lib/tenant-directory";

// GET /api/tenants/options - Sélecteur du formulaire de bail : « mes » locataires
// (bail sur un de mes biens, ou invitation que j'ai envoyée et qui a été acceptée)
// et mes invitations encore en attente. Jamais l'annuaire complet de la plateforme.
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const scope = tenantLeaseScope(session.user);
    if (!scope) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    }

    const invitations = await prisma.invitation.findMany({
      where: { invitedById: session.user.id },
      select: { id: true, email: true, name: true, expiresAt: true, acceptedAt: true },
      orderBy: { createdAt: "desc" },
      take: 200,
    });

    const acceptedEmails = [
      ...new Set(invitations.filter((i) => i.acceptedAt).map((i) => i.email)),
    ];

    const tenants = await prisma.user.findMany({
      where: pickerTenantWhere(scope, acceptedEmails),
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    });

    const now = new Date();
    const pendingInvitations = invitations
      .filter((i) => !i.acceptedAt && i.expiresAt > now)
      .map(({ id, email, name, expiresAt }) => ({ id, email, name, expiresAt }));

    return NextResponse.json({ tenants, pendingInvitations });
  } catch (error) {
    console.error("Erreur lors de la récupération des locataires:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
