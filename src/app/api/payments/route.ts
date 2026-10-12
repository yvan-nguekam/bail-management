import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { notify } from "@/lib/notify";
import { formatCurrency } from "@/lib/utils";
import { absoluteUrl, buildEmailSubject } from "@/lib/notification-preferences";
import { PaymentReminderEmail } from "@/emails/payment-reminder";

// Schema de validation pour un paiement
const paymentSchema = z.object({
  leaseId: z.string().min(1, "Le bail est requis"),
  amount: z.number().positive("Le montant doit être positif"),
  dueDate: z.string().datetime(),
  paymentMethod: z.enum(["CASH", "BANK_TRANSFER", "CREDIT_CARD", "CHECK", "MOBILE_MONEY"]).optional(),
  notes: z.string().optional(),
});

// GET /api/payments - Liste tous les paiements
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: "Non authentifié" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const status = searchParams.get("status");
    const leaseId = searchParams.get("leaseId");

    const skip = (page - 1) * limit;

    // Construire les filtres selon le rôle
    const where: any = {};

    if (session.user.role === "LANDLORD") {
      where.lease = {
        property: {
          ownerId: session.user.id,
        },
      };
    } else if (session.user.role === "MANAGER") {
      where.lease = {
        property: {
          OR: [
            { ownerId: session.user.id },
            { managerId: session.user.id },
          ],
        },
      };
    } else if (session.user.role === "TENANT") {
      where.lease = {
        tenantId: session.user.id,
      };
    }
    // Les ADMIN voient tout

    if (status) {
      where.status = status;
    }

    if (leaseId) {
      where.leaseId = leaseId;
    }

    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        skip,
        take: limit,
        include: {
          lease: {
            include: {
              property: {
                select: {
                  id: true,
                  name: true,
                  address: true,
                  city: true,
                },
              },
              tenant: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
        },
        orderBy: {
          dueDate: "desc",
        },
      }),
      prisma.payment.count({ where }),
    ]);

    return NextResponse.json({
      payments,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Erreur lors de la récupération des paiements:", error);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}

// POST /api/payments - Crée un nouveau paiement
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: "Non authentifié" },
        { status: 401 }
      );
    }

    // Seuls les LANDLORD, MANAGER et ADMIN peuvent créer des paiements
    if (!["LANDLORD", "MANAGER", "ADMIN"].includes(session.user.role)) {
      return NextResponse.json(
        { error: "Non autorisé" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validatedData = paymentSchema.parse(body);

    // Vérifier que le bail existe et appartient à l'utilisateur
    const lease = await prisma.lease.findUnique({
      where: { id: validatedData.leaseId },
      include: {
        property: true,
        tenant: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!lease) {
      return NextResponse.json(
        { error: "Bail non trouvé" },
        { status: 404 }
      );
    }

    const canCreatePayment =
      session.user.role === "ADMIN" ||
      lease.property.ownerId === session.user.id ||
      lease.property.managerId === session.user.id;

    if (!canCreatePayment) {
      return NextResponse.json(
        { error: "Non autorisé pour ce bail" },
        { status: 403 }
      );
    }

    // Convertir la date
    const dueDate = new Date(validatedData.dueDate);

    // Déterminer le statut initial
    const now = new Date();
    const status = dueDate > now ? "PENDING" : "OVERDUE";

    const payment = await prisma.payment.create({
      data: {
        ...validatedData,
        tenantId: lease.tenantId,
        dueDate,
        status,
      },
      include: {
        lease: {
          include: {
            property: {
              select: {
                id: true,
                name: true,
              },
            },
            tenant: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    // Créer une entrée d'activité
    await prisma.activity.create({
      data: {
        userId: session.user.id,
        action: "CREATE_PAYMENT",
        entityType: "PAYMENT",
        entityId: payment.id,
        details: `Paiement créé pour ${lease.property.name} - ${lease.tenant.name}`,
      },
    });

    // Créer une notification pour le locataire
    await notify({
      userId: lease.tenantId,
      type: "PAYMENT_REMINDER",
      title: "Nouveau paiement à effectuer",
      message: `Un paiement de ${formatCurrency(payment.amount)} est dû le ${dueDate.toLocaleDateString("fr-FR")}`,
      relatedId: payment.id,
      link: `/payments/${payment.id}`,
      email: {
        subject: buildEmailSubject("Nouveau loyer à régler", lease.property.name),
        react: (recipient) =>
          PaymentReminderEmail({
            tenantName: recipient.name,
            propertyName: lease.property.name,
            amount: payment.amount,
            dueDate,
            paymentUrl: absoluteUrl(`/payments/${payment.id}`),
          }),
      },
    });

    return NextResponse.json(payment, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Données invalides", details: error.issues },
        { status: 400 }
      );
    }

    console.error("Erreur lors de la création du paiement:", error);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}
