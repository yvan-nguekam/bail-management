import { NextRequest, NextResponse } from "next/server";
import { createElement } from "react";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { enforceRateLimit } from "@/lib/api-rate-limit";
import { sendLinkEmail } from "@/lib/link-email";
import { canManageTenants, lookupResult } from "@/lib/tenant-directory";
import {
  INVITATION_TTL_MS,
  appBaseUrl,
  expiresAt,
  generateToken,
  normalizeEmail,
} from "@/lib/security-tokens";
import { TenantInvitationEmail } from "@/emails/tenant-invitation";

const inviteSchema = z.object({
  email: z.string().trim().max(254).email("Adresse e-mail invalide"),
  name: z.string().trim().min(1, "Le nom est requis").max(100, "100 caractères maximum"),
  phone: z.string().trim().max(30, "30 caractères maximum").optional().or(z.literal("")),
});

// POST /api/tenants/invite - Invite un locataire sans compte (lien valable 7 jours).
// Le compte n'est créé qu'à l'acceptation, avec le mot de passe choisi par le locataire.
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    if (!canManageTenants(session.user.role)) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    }

    const limited = enforceRateLimit(request, "tenantInvite", session.user.id);
    if (limited) return limited;

    const parsed = inviteSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Données invalides", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const email = normalizeEmail(parsed.data.email);

    const existing = await prisma.user.findUnique({
      where: { email },
      select: { id: true, name: true, role: true },
    });

    if (existing) {
      if (existing.role === "TENANT") {
        // Même information que la recherche par e-mail exact : id et nom uniquement
        return NextResponse.json({ status: "existing", tenant: lookupResult(existing) });
      }
      return NextResponse.json(
        { error: "Cette adresse ne peut pas être invitée comme locataire" },
        { status: 409 }
      );
    }

    const { token, tokenHash } = generateToken();

    // Une seule invitation en attente par bailleur et par adresse : la précédente est remplacée
    const [, invitation] = await prisma.$transaction([
      prisma.invitation.deleteMany({
        where: { invitedById: session.user.id, email, acceptedAt: null },
      }),
      prisma.invitation.create({
        data: {
          email,
          name: parsed.data.name,
          phone: parsed.data.phone || null,
          tokenHash,
          invitedById: session.user.id,
          expiresAt: expiresAt(INVITATION_TTL_MS),
        },
        select: { id: true, email: true, name: true, expiresAt: true },
      }),
    ]);

    const acceptUrl = `${appBaseUrl()}/auth/accept-invite?token=${token}`;
    const emailSent = await sendLinkEmail({
      to: email,
      subject: `${session.user.name} vous invite sur RentalManager`,
      react: createElement(TenantInvitationEmail, {
        name: invitation.name,
        inviterName: session.user.name,
        acceptUrl,
      }),
      link: acceptUrl,
      label: "tenant-invitation",
    });

    await prisma.activity.create({
      data: {
        userId: session.user.id,
        action: "INVITE_TENANT",
        entityType: "INVITATION",
        entityId: invitation.id,
        details: `Invitation envoyée à ${invitation.name}`,
      },
    });

    return NextResponse.json({ status: "invited", invitation, emailSent }, { status: 201 });
  } catch (error) {
    console.error("Erreur lors de l'invitation du locataire:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
