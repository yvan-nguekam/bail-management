import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")
    const status = searchParams.get("status")

    // Build where clause
    const where: any = {}

    if (session.user.role === "LANDLORD" || session.user.role === "MANAGER") {
      where.lease = {
        property: {
          OR: [{ ownerId: session.user.id }, { managerId: session.user.id }]
        }
      }
    } else if (session.user.role === "TENANT") {
      where.lease = {
        tenantId: session.user.id
      }
    }

    if (startDate) {
      where.dueDate = { ...where.dueDate, gte: new Date(startDate) }
    }

    if (endDate) {
      where.dueDate = { ...where.dueDate, lte: new Date(endDate) }
    }

    if (status) {
      where.status = status
    }

    const payments = await prisma.payment.findMany({
      where,
      include: {
        lease: {
          // Jamais l'enregistrement User complet (hash du mot de passe, etc.)
          include: {
            property: { select: { id: true, name: true, address: true, city: true } },
            tenant: { select: { id: true, name: true, email: true, phone: true } }
          }
        }
      },
      orderBy: {
        dueDate: "desc"
      }
    })

    return NextResponse.json(payments)
  } catch (error) {
    console.error("Export payments error:", error)
    return NextResponse.json(
      { error: "Failed to export payments" },
      { status: 500 }
    )
  }
}
