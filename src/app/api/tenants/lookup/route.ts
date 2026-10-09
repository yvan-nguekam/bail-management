import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { enforceRateLimit } from "@/lib/api-rate-limit";
import { canManageTenants, lookupResult, parseLookupEmail } from "@/lib/tenant-directory";

// GET /api/tenants/lookup?email= - Retrouve un compte locataire par e-mail EXACT.
// Renvoie au plus { id, name } : aucune recherche partielle, aucun e-mail / téléphone.
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    if (!canManageTenants(session.user.role)) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    }

    // Limite par compte (pas par IP) : freine l'énumération d'adresses
    const limited = enforceRateLimit(request, "tenantLookup", session.user.id);
    if (limited) return limited;

    const email = parseLookupEmail(request.nextUrl.searchParams.get("email"));
    if (!email) {
      return NextResponse.json(
        { error: "Saisissez l'adresse e-mail complète du locataire" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findFirst({
      where: { email, role: "TENANT" },
      select: { id: true, name: true },
    });

    return NextResponse.json({ tenant: lookupResult(user) });
  } catch (error) {
    console.error("Erreur lors de la recherche de locataire:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
