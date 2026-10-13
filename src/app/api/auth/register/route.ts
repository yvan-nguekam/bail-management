import { NextResponse, after } from "next/server"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { enforceRateLimit } from "@/lib/api-rate-limit"
import { sendLinkEmail } from "@/lib/link-email"
import { AccountExistsEmail } from "@/emails/account-exists"

// Même réponse que l'adresse soit libre ou déjà prise : l'inscription ne doit pas
// permettre de savoir qui a un compte. Le titulaire existant est prévenu par e-mail.
const NEUTRAL_RESPONSE = {
  message:
    "Inscription enregistrée. Connectez-vous avec vos identifiants. Si cette adresse avait déjà un compte, un e-mail vous a été envoyé.",
}

// ADMIN ne peut jamais être choisi à l'inscription publique
const registerSchema = z.object({
  name: z.string().trim().min(1, "Le nom est requis"),
  email: z.string().trim().toLowerCase().email("Email invalide"),
  password: z.string().min(8, "Le mot de passe doit contenir au moins 8 caractères"),
  phone: z.string().trim().optional(),
  role: z.enum(["TENANT", "LANDLORD", "MANAGER"]).default("TENANT"),
})

export async function POST(request: Request) {
  try {
    const limited = enforceRateLimit(request, "register")
    if (limited) return limited

    const parsed = registerSchema.safeParse(await request.json())

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid data", details: parsed.error.issues },
        { status: 400 }
      )
    }

    const { email, password, name, role, phone } = parsed.data

    // Hachage dans tous les cas : le temps de réponse ne trahit pas un compte existant
    const hashedPassword = await bcrypt.hash(password, 12)

    const existingUser = await prisma.user.findUnique({
      where: { email },
      select: { name: true, email: true },
    })

    if (existingUser) {
      // Après la réponse, pour ne pas allonger ce cas par rapport à une vraie création
      after(() =>
        sendLinkEmail({
          to: existingUser.email,
          subject: "Une inscription a été tentée avec votre adresse",
          react: AccountExistsEmail({ name: existingUser.name }),
          link: "/auth/forgot-password",
          label: "account-exists",
        })
      )
      return NextResponse.json(NEUTRAL_RESPONSE, { status: 201 })
    }

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        phone: phone || null,
        role,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        phone: true,
        createdAt: true,
      }
    })

    // Log activity
    await prisma.activity.create({
      data: {
        action: "USER_REGISTERED",
        entityType: "USER",
        entityId: user.id,
        details: `${user.name} registered as ${user.role}`,
        userId: user.id,
      }
    })

    return NextResponse.json(NEUTRAL_RESPONSE, { status: 201 })
  } catch (error) {
    console.error("Registration error:", error)
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    )
  }
}
