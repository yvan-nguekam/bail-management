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

const schema = z
  .object({
    token: z.string(),
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

const INVALID_LINK =
  "Ce lien de réinitialisation est invalide ou a expiré. Faites une nouvelle demande."

// POST /api/auth/reset-password - Nouveau mot de passe via un lien à usage unique
export async function POST(request: Request) {
  try {
    const limited = enforceRateLimit(request, "resetPassword")
    if (limited) return limited

    const parsed = schema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Données invalides" },
        { status: 400 }
      )
    }

    const { token, password } = parsed.data
    if (!isWellFormedToken(token)) {
      return NextResponse.json({ error: INVALID_LINK }, { status: 400 })
    }

    const record = await prisma.passwordResetToken.findUnique({
      where: { tokenHash: hashToken(token) },
    })
    if (!record || tokenState(record) !== "valid") {
      return NextResponse.json({ error: INVALID_LINK }, { status: 400 })
    }

    const hashed = await bcrypt.hash(password, 12)
    const now = new Date()

    const ok = await prisma.$transaction(async (tx) => {
      // Consommation atomique : deux requêtes simultanées ne peuvent pas utiliser le même lien
      const claimed = await tx.passwordResetToken.updateMany({
        where: { id: record.id, usedAt: null, expiresAt: { gt: now } },
        data: { usedAt: now },
      })
      if (claimed.count !== 1) return false

      // passwordChangedAt révoque les sessions (JWT) ouvertes avant la réinitialisation
      await tx.user.update({
        where: { id: record.userId },
        data: { password: hashed, passwordChangedAt: now },
      })
      // Les autres liens encore actifs de l'utilisateur deviennent inutilisables
      await tx.passwordResetToken.deleteMany({
        where: { userId: record.userId, usedAt: null },
      })
      await tx.activity.create({
        data: {
          userId: record.userId,
          action: "RESET_PASSWORD",
          entityType: "USER",
          entityId: record.userId,
          details: "Mot de passe réinitialisé par lien e-mail",
        },
      })
      return true
    })

    if (!ok) {
      return NextResponse.json({ error: INVALID_LINK }, { status: 400 })
    }

    return NextResponse.json({ message: "Mot de passe réinitialisé" })
  } catch (error) {
    console.error("Erreur reset-password:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
