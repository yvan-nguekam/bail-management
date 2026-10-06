import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const markPaidSchema = z.object({
  paymentMethod: z.enum(["CASH", "BANK_TRANSFER", "CREDIT_CARD", "CHECK", "MOBILE_MONEY"]),
  transactionId: z.string().optional(),
  paidDate: z.string().datetime().optional(),
  notes: z.string().optional(),
});

// POST /api/payments/[id]/mark-paid - Marquer un paiement comme payé
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: "Non authentifié" },
        { status: 401 }
      );
    }

    const payment = await prisma.payment.findUnique({
      where: { id },
      include: {
        lease: {
          include: {
            property: true,
            tenant: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    if (!payment) {
      return NextResponse.json(
        { error: "Paiement non trouvé" },
        { status: 404 }
      );
    }

    // Vérifier les permissions
    const canMarkPaid =
      session.user.role === "ADMIN" ||
      payment.lease.property.ownerId === session.user.id ||
      payment.lease.property.managerId === session.user.id;

    if (!canMarkPaid) {
      return NextResponse.json(
        { error: "Non autorisé" },
        { status: 403 }
      );
    }

    // Vérifier que le paiement n'est pas déjà payé
    if (payment.status === "PAID") {
      return NextResponse.json(
        { error: "Ce paiement a déjà été marqué comme payé" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { paymentMethod, transactionId, paidDate, notes } = markPaidSchema.parse(body);

    const paidDateTime = paidDate ? new Date(paidDate) : new Date();

    // Mettre à jour le paiement
    const updatedPayment = await prisma.payment.update({
      where: { id },
      data: {
        status: "PAID",
        paidDate: paidDateTime,
        paymentMethod,
        reference: transactionId,
        notes: notes || payment.notes,
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

    // Créer une notification pour le locataire
    await prisma.notification.create({
      data: {
        userId: payment.lease.tenantId,
        type: "PAYMENT_RECEIVED",
        title: "Paiement confirmé",
        message: `Votre paiement de ${payment.amount.toLocaleString()} FCFA pour ${payment.lease.property.name} a été confirmé`,
        relatedId: payment.id,
      },
    });

    // Créer une entrée d'activité
    await prisma.activity.create({
      data: {
        userId: session.user.id,
        action: "MARK_PAYMENT_PAID",
        entityType: "PAYMENT",
        entityId: payment.id,
        details: `Paiement marqué comme payé - ${payment.lease.property.name} - ${payment.lease.tenant.name}`,
      },
    });

    return NextResponse.json(updatedPayment);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Données invalides", details: error.issues },
        { status: 400 }
      );
    }

    console.error("Erreur lors du marquage du paiement:", error);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}
