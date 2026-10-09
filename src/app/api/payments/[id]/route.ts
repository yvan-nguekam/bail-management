import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { notify } from "@/lib/notify";
import { formatCurrency } from "@/lib/utils";
import { absoluteUrl, buildEmailSubject } from "@/lib/notification-preferences";
import { PaymentReceivedEmail } from "@/emails/payment-received";

// Schema de validation pour mise à jour
const updatePaymentSchema = z.object({
  amount: z.number().positive().optional(),
  dueDate: z.string().datetime().optional(),
  status: z.enum(["PENDING", "PAID", "OVERDUE", "CANCELLED"]).optional(),
  paidDate: z.string().datetime().optional().nullable(),
  paymentMethod: z.enum(["CASH", "BANK_TRANSFER", "CREDIT_CARD", "CHECK", "MOBILE_MONEY"]).optional(),
  transactionId: z.string().optional().nullable(),
  notes: z.string().optional(),
});

// GET /api/payments/[id] - Récupère un paiement par ID
export async function GET(
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
            property: {
              include: {
                owner: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                    phone: true,
                  },
                },
              },
            },
            tenant: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
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
    const canView =
      session.user.role === "ADMIN" ||
      payment.lease.property.ownerId === session.user.id ||
      payment.lease.property.managerId === session.user.id ||
      payment.lease.tenantId === session.user.id;

    if (!canView) {
      return NextResponse.json(
        { error: "Non autorisé" },
        { status: 403 }
      );
    }

    return NextResponse.json(payment);
  } catch (error) {
    console.error("Erreur lors de la récupération du paiement:", error);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}

// PUT /api/payments/[id] - Met à jour un paiement
export async function PUT(
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

    // Vérifier que le paiement existe
    const existingPayment = await prisma.payment.findUnique({
      where: { id },
      include: {
        lease: {
          include: {
            property: true,
          },
        },
      },
    });

    if (!existingPayment) {
      return NextResponse.json(
        { error: "Paiement non trouvé" },
        { status: 404 }
      );
    }

    // Vérifier les permissions
    const canEdit =
      session.user.role === "ADMIN" ||
      existingPayment.lease.property.ownerId === session.user.id ||
      existingPayment.lease.property.managerId === session.user.id;

    if (!canEdit) {
      return NextResponse.json(
        { error: "Non autorisé" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validatedData = updatePaymentSchema.parse(body);

    // Convertir les dates si présentes
    const updateData: any = { ...validatedData };
    if (validatedData.dueDate) {
      updateData.dueDate = new Date(validatedData.dueDate);
    }
    if (validatedData.paidDate) {
      updateData.paidDate = new Date(validatedData.paidDate);
    }

    const payment = await prisma.payment.update({
      where: { id },
      data: updateData,
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

    // Si le paiement passe à PAID, créer une notification
    if (
      validatedData.status === "PAID" &&
      existingPayment.status !== "PAID"
    ) {
      await notify({
        userId: existingPayment.lease.tenantId,
        type: "PAYMENT_RECEIVED",
        title: "Paiement confirmé",
        message: `Votre paiement de ${formatCurrency(payment.amount)} a été confirmé`,
        relatedId: payment.id,
        link: `/payments/${payment.id}`,
        email: {
          subject: buildEmailSubject("Paiement confirmé", existingPayment.lease.property.name),
          react: (recipient) =>
            PaymentReceivedEmail({
              tenantName: recipient.name,
              propertyName: existingPayment.lease.property.name,
              amount: payment.amount,
              paidDate: payment.paidDate,
              paymentMethod: payment.paymentMethod,
              reference: payment.reference,
              paymentUrl: absoluteUrl(`/payments/${payment.id}`),
            }),
        },
      });
    }

    // Créer une entrée d'activité
    await prisma.activity.create({
      data: {
        userId: session.user.id,
        action: "UPDATE_PAYMENT",
        entityType: "PAYMENT",
        entityId: payment.id,
        details: `Paiement mis à jour - ${existingPayment.lease.property.name}`,
      },
    });

    return NextResponse.json(payment);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Données invalides", details: error.issues },
        { status: 400 }
      );
    }

    console.error("Erreur lors de la mise à jour du paiement:", error);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}

// DELETE /api/payments/[id] - Supprime un paiement
export async function DELETE(
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

    // Vérifier que le paiement existe
    const existingPayment = await prisma.payment.findUnique({
      where: { id },
      include: {
        lease: {
          include: {
            property: true,
          },
        },
      },
    });

    if (!existingPayment) {
      return NextResponse.json(
        { error: "Paiement non trouvé" },
        { status: 404 }
      );
    }

    // Vérifier les permissions (seul l'admin ou le propriétaire peut supprimer)
    const canDelete =
      session.user.role === "ADMIN" ||
      existingPayment.lease.property.ownerId === session.user.id;

    if (!canDelete) {
      return NextResponse.json(
        { error: "Non autorisé" },
        { status: 403 }
      );
    }

    // Empêcher la suppression si le paiement a déjà été effectué
    if (existingPayment.status === "PAID") {
      return NextResponse.json(
        {
          error:
            "Impossible de supprimer un paiement déjà effectué",
        },
        { status: 400 }
      );
    }

    await prisma.payment.delete({
      where: { id },
    });

    // Créer une entrée d'activité
    await prisma.activity.create({
      data: {
        userId: session.user.id,
        action: "DELETE_PAYMENT",
        entityType: "PAYMENT",
        entityId: id,
        details: `Paiement supprimé - ${existingPayment.lease.property.name}`,
      },
    });

    return NextResponse.json({ message: "Paiement supprimé avec succès" });
  } catch (error) {
    console.error("Erreur lors de la suppression du paiement:", error);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}
