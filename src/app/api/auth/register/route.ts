import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { enforceRateLimit } from "@/lib/api-rate-limit"

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

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      return NextResponse.json(
        { error: "User already exists" },
        { status: 400 }
      )
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12)

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

    return NextResponse.json(
      {
        message: "User created successfully",
        user
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("Registration error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
