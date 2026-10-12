import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { enforceRateLimit } from "@/lib/api-rate-limit"
import {
  MIN_PASSWORD_LENGTH,
  hashToken,
  isWellFormedToken,
  tokenState,
} from "@/lib/security-tokens"

const INVALID_INVITE = "Cette invitation est invalide ou a expiré. Demandez-en une nouvelle à votre bailleur."
const ACCOUNT_EXISTS =
  "Un compte existe déjà pour cette adresse. Connectez-vous ou réinitialisez votre mot de passe."

async function findValidInvitation(token: unknown) {
  if (!isWellFormedToken(token)) return null
  const invitation = await prisma.invitation.findUnique({
    where: { tokenHash: hashToken(token) },
  })
  if (!invitation || tokenState(invitation) !== "valid") return null
  return invitation
}

// GET /api/auth/accept-invite?token= - Informations affichées sur la page d'acceptation
export async function GET(request: Request) {
  try {
    const limited = enforceRateLimit(request, "acceptInvite")
    if (limited) return limited

    const token = new URL(request.url).searchParams.get("token")
    const invitation = await findValidInvitation(token)
    if (!invitation) {
      return NextResponse.json({ error: INVALID_INVITE }, { status: 400 })
    }

    // Le lien prouve la possession de la boîte : on peut lui renvoyer son e-mail et son nom
    return NextResponse.json({ email: invitation.email, name: invitation.name })
  } catch (error) {
    console.error("Erreur accept-invite (GET):", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}

const acceptSchema = z
  .object({
    token: z.string(),
    name: z.string().trim().min(1, "Le nom est requis").max(100, "100 caractères maximum"),
    password: z
      .string()
      .min(MIN_PASSWORD_LENGTH, `Le mot de passe doit contenir au moins ${MIN_PASSWORD_LENGTH} caractères`)
      .max(200, "200 caractères maximum"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Les mots de passe ne correspondent pas",
    path: ["confirmPassword"],
  })

// POST /api/auth/accept-invite - Crée le compte locataire à partir de l'invitation
export async function POST(request: Request) {
  try {
    const limited = enforceRateLimit(request, "acceptInvite")
    if (limited) return limited

    const parsed = acceptSchema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Données invalides" },
        { status: 400 }
      )
    }

    const invitation = await findValidInvitation(parsed.data.token)
    if (!invitation) {
      return NextResponse.json({ error: INVALID_INVITE }, { status: 400 })
    }

    const existing = await prisma.user.findUnique({
      where: { email: invitation.email },
      select: { id: true },
    })
    if (existing) {
      return NextResponse.json({ error: ACCOUNT_EXISTS }, { status: 409 })
    }

    const hashed = await bcrypt.hash(parsed.data.password, 12)
    const now = new Date()

    const user = await prisma.$transaction(async (tx) => {
      const claimed = await tx.invitation.updateMany({
        where: { id: invitation.id, acceptedAt: null, expiresAt: { gt: now } },
        data: { acceptedAt: now },
      })
      if (claimed.count !== 1) return null

      const created = await tx.user.create({
        data: {
          email: invitation.email,
          name: parsed.data.name,
          phone: invitation.phone,
          password: hashed,
          role: "TENANT",
          // Le lien reçu par e-mail prouve la possession de l'adresse
          emailVerified: now,
        },
        select: { id: true, email: true, name: true },
      })

      // Les autres invitations en attente pour cette adresse sont considérées acceptées :
      // chaque bailleur ayant invité ce locataire le retrouve dans son sélecteur.
      await tx.invitation.updateMany({
        where: { email: invitation.email, acceptedAt: null },
        data: { acceptedAt: now },
      })

      await tx.activity.create({
        data: {
          userId: created.id,
          action: "USER_REGISTERED",
          entityType: "USER",
          entityId: created.id,
          details: `${created.name} a accepté une invitation (locataire)`,
        },
      })
      return created
    })

    if (!user) {
      return NextResponse.json({ error: INVALID_INVITE }, { status: 400 })
    }

    await prisma.notification
      .create({
        data: {
          userId: invitation.invitedById,
          type: "SYSTEM",
          title: "Invitation acceptée",
          message: `${user.name} a créé son compte locataire. Vous pouvez maintenant lui associer un bail.`,
          link: "/leases/new",
          relatedId: user.id,
        },
      })
      .catch((error) => console.error("Notification d'invitation non créée:", error))

    return NextResponse.json({ email: user.email }, { status: 201 })
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      (error as { code?: string }).code === "P2002"
    ) {
      return NextResponse.json({ error: ACCOUNT_EXISTS }, { status: 409 })
    }
    console.error("Erreur accept-invite (POST):", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
