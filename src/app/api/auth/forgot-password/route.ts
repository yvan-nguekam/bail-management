import { NextResponse, after } from "next/server"
import { createElement } from "react"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { enforceRateLimit } from "@/lib/api-rate-limit"
import { rateLimiter } from "@/lib/rate-limit"
import { sendLinkEmail } from "@/lib/link-email"
import {
  PASSWORD_RESET_TTL_MS,
  appBaseUrl,
  expiresAt,
  generateToken,
  normalizeEmail,
} from "@/lib/security-tokens"
import { PasswordResetEmail } from "@/emails/password-reset"

const schema = z.object({
  email: z.string().trim().max(254).email("Adresse e-mail invalide"),
})

// Réponse identique que le compte existe ou non (pas d'énumération des e-mails)
const NEUTRAL_MESSAGE =
  "Si un compte est associé à cette adresse, un e-mail contenant un lien de réinitialisation vient d'être envoyé."

// POST /api/auth/forgot-password - Envoie un lien de réinitialisation (valable 1 h)
export async function POST(request: Request) {
  try {
    const limited = enforceRateLimit(request, "forgotPasswordIp")
    if (limited) return limited

    const parsed = schema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Données invalides" },
        { status: 400 }
      )
    }

    const email = normalizeEmail(parsed.data.email)

    // Limite par e-mail silencieuse : même réponse, mais plus d'envoi (anti-harcèlement)
    const perEmail = rateLimiter("forgotPasswordEmail").consume(`forgot:${email}`)

    if (perEmail.allowed) {
      // Traitement après la réponse : le temps de réponse ne dépend pas de l'existence du compte
      after(async () => {
        try {
          await issueResetLink(email)
        } catch (error) {
          console.error("Erreur lors de l'envoi du lien de réinitialisation:", error)
        }
      })
    }

    return NextResponse.json({ message: NEUTRAL_MESSAGE })
  } catch (error) {
    console.error("Erreur forgot-password:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}

async function issueResetLink(email: string) {
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, name: true, email: true },
  })
  if (!user) return

  const { token, tokenHash } = generateToken()

  await prisma.$transaction([
    // Un seul lien actif à la fois : les demandes précédentes non utilisées sont supprimées
    prisma.passwordResetToken.deleteMany({ where: { userId: user.id, usedAt: null } }),
    prisma.passwordResetToken.create({
      data: { userId: user.id, tokenHash, expiresAt: expiresAt(PASSWORD_RESET_TTL_MS) },
    }),
  ])

  const resetUrl = `${appBaseUrl()}/auth/reset-password?token=${token}`
  await sendLinkEmail({
    to: user.email,
    subject: "Réinitialisation de votre mot de passe",
    react: createElement(PasswordResetEmail, { name: user.name, resetUrl }),
    link: resetUrl,
    label: "password-reset",
  })
}
