import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { computeDepositBalance, getDepositActionError } from "@/lib/deposit";
import {
  buildDepositSummary,
  canManageDeposit,
  canViewDeposit,
  loadDepositLease,
} from "@/lib/deposit-access";
import { formatCurrency } from "@/lib/utils";
import { notify } from "@/lib/notify";
import { absoluteUrl, buildEmailSubject } from "@/lib/notification-preferences";
import { DepositUpdateEmail } from "@/emails/deposit-update";

const paymentMethodSchema = z.enum([
  "CASH",
  "BANK_TRANSFER",
  "CREDIT_CARD",
  "CHECK",
  "MOBILE_MONEY",
]);

const depositActionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("receive"),
    receivedAt: z.string().datetime(),
    paymentMethod: paymentMethodSchema,
    reference: z.string().trim().max(200).optional(),
    // Par défaut : montant de caution prévu au bail
    amount: z.number().int().positive().optional(),
  }),
  z.object({
    action: z.literal("settle"),
    settledAt: z.string().datetime(),
    refundMethod: paymentMethodSchema.optional(),
  }),
]);

const formatDate = (date: Date) =>
  date.toLocaleDateString("fr-FR", { timeZone: "UTC" });

// GET /api/leases/[id]/deposit - Situation de la caution
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const lease = await loadDepositLease(id);

    if (!lease) {
      return NextResponse.json({ error: "Bail non trouvé" }, { status: 404 });
    }

    if (!canViewDeposit(session.user, lease)) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    }

    return NextResponse.json(buildDepositSummary(lease, session.user));
  } catch (error) {
    console.error("Erreur lors de la récupération de la caution:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// POST /api/leases/[id]/deposit - Réception ("receive") ou restitution ("settle") de la caution
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const lease = await loadDepositLease(id);

    if (!lease) {
      return NextResponse.json({ error: "Bail non trouvé" }, { status: 404 });
    }

    if (!canManageDeposit(session.user, lease)) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    }

    const body = await request.json();
    const input = depositActionSchema.parse(body);

    const stateError = getDepositActionError(input.action, {
      leaseStatus: lease.status,
      depositStatus: lease.depositStatus,
    });
    if (stateError) {
      return NextResponse.json({ error: stateError }, { status: 400 });
    }

    if (input.action === "receive") {
      const amount = input.amount ?? Math.round(lease.securityDeposit);
      if (amount <= 0) {
        return NextResponse.json(
          { error: "Aucun montant de caution n'est prévu pour ce bail" },
          { status: 400 }
        );
      }
      const receivedAt = new Date(input.receivedAt);

      // Garde contre une double réception concurrente
      const { count } = await prisma.lease.updateMany({
        where: { id, depositStatus: "NOT_RECEIVED" },
        data: {
          depositStatus: "HELD",
          depositReceivedAmount: amount,
          depositReceivedAt: receivedAt,
          depositPaymentMethod: input.paymentMethod,
          depositReference: input.reference || null,
        },
      });
      if (count === 0) {
        return NextResponse.json(
          { error: "La caution a déjà été reçue" },
          { status: 409 }
        );
      }

      await notify({
        userId: lease.tenantId,
        type: "DEPOSIT_RECEIVED",
        title: "Caution reçue",
        message: `Votre caution de ${formatCurrency(amount)} pour ${lease.property.name} a été reçue le ${formatDate(receivedAt)}`,
        relatedId: lease.id,
        link: `/leases/${lease.id}`,
        email: {
          subject: buildEmailSubject("Caution reçue", lease.property.name),
          react: (recipient) =>
            DepositUpdateEmail({
              kind: "received",
              recipientName: recipient.name,
              propertyName: lease.property.name,
              amount,
              receivedAt,
              leaseUrl: absoluteUrl(`/leases/${lease.id}`),
            }),
        },
      });

      await prisma.activity.create({
        data: {
          userId: session.user.id,
          action: "RECEIVE_DEPOSIT",
          entityType: "LEASE",
          entityId: lease.id,
          details: `Caution de ${formatCurrency(amount)} reçue pour ${lease.property.name}`,
        },
      });
    } else {
      const settledAt = new Date(input.settledAt);
      if (lease.depositReceivedAt && settledAt < lease.depositReceivedAt) {
        return NextResponse.json(
          { error: "La date de restitution doit être postérieure à la réception de la caution" },
          { status: 400 }
        );
      }

      const result = await prisma.$transaction(async (tx) => {
        // Retenues relues dans la transaction pour un calcul à jour
        const deductions = await tx.depositDeduction.findMany({
          where: { leaseId: id },
          select: { amount: true },
        });
        const balance = computeDepositBalance(
          lease.depositReceivedAmount ?? 0,
          deductions.map((deduction) => deduction.amount)
        );

        if (balance.refundAmount > 0 && !input.refundMethod) {
          return { error: "Veuillez indiquer le mode de restitution" } as const;
        }

        const { count } = await tx.lease.updateMany({
          where: { id, depositStatus: "HELD" },
          data: {
            depositStatus: "SETTLED",
            depositSettledAt: settledAt,
            depositRefundAmount: balance.refundAmount,
            depositRefundMethod: balance.refundAmount > 0 ? input.refundMethod : null,
          },
        });
        if (count === 0) {
          return { error: "La caution a déjà été restituée" } as const;
        }

        return { balance } as const;
      });

      if ("error" in result) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }

      const { balance } = result;
      const dueText =
        balance.remainingDue > 0
          ? ` Les retenues dépassent la caution : ${formatCurrency(balance.remainingDue)} restent dus.`
          : "";

      await notify({
        userId: lease.tenantId,
        type: "DEPOSIT_SETTLED",
        title: "Caution restituée",
        message: `Votre caution pour ${lease.property.name} a été soldée le ${formatDate(settledAt)} : ${formatCurrency(balance.refundAmount)} restitués, ${formatCurrency(balance.totalDeductions)} retenus.${dueText}`,
        relatedId: lease.id,
        link: `/leases/${lease.id}`,
        email: {
          subject: buildEmailSubject("Caution restituée", lease.property.name),
          react: (recipient) =>
            DepositUpdateEmail({
              kind: "settled",
              recipientName: recipient.name,
              propertyName: lease.property.name,
              settledAt,
              refundAmount: balance.refundAmount,
              totalDeductions: balance.totalDeductions,
              remainingDue: balance.remainingDue,
              leaseUrl: absoluteUrl(`/leases/${lease.id}`),
            }),
        },
      });

      await prisma.activity.create({
        data: {
          userId: session.user.id,
          action: "SETTLE_DEPOSIT",
          entityType: "LEASE",
          entityId: lease.id,
          details: `Caution restituée pour ${lease.property.name} : ${formatCurrency(balance.refundAmount)} restitués, ${formatCurrency(balance.totalDeductions)} retenus`,
        },
      });
    }

    const updated = await loadDepositLease(id);
    return NextResponse.json(buildDepositSummary(updated!, session.user));
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Données invalides", details: error.issues },
        { status: 400 }
      );
    }

    console.error("Erreur lors de la mise à jour de la caution:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
