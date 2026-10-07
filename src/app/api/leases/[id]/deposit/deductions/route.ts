import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { getDepositActionError } from "@/lib/deposit";
import {
  buildDepositSummary,
  canManageDeposit,
  loadDepositLease,
} from "@/lib/deposit-access";
import { formatCurrency } from "@/lib/utils";

const deductionSchema = z.object({
  label: z.string().trim().min(1, "Le libellé est requis").max(200),
  amount: z.number().int().positive(),
});

// POST /api/leases/[id]/deposit/deductions - Ajoute une retenue sur la caution
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

    const { label, amount } = deductionSchema.parse(await request.json());

    const stateError = getDepositActionError("addDeduction", {
      leaseStatus: lease.status,
      depositStatus: lease.depositStatus,
    });
    if (stateError) {
      return NextResponse.json({ error: stateError }, { status: 400 });
    }

    await prisma.depositDeduction.create({
      data: {
        leaseId: id,
        label,
        amount,
        createdById: session.user.id,
      },
    });

    await prisma.activity.create({
      data: {
        userId: session.user.id,
        action: "ADD_DEPOSIT_DEDUCTION",
        entityType: "LEASE",
        entityId: id,
        details: `Retenue sur caution « ${label} » de ${formatCurrency(amount)} pour ${lease.property.name}`,
      },
    });

    const updated = await loadDepositLease(id);
    return NextResponse.json(buildDepositSummary(updated!, session.user), {
      status: 201,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Données invalides", details: error.issues },
        { status: 400 }
      );
    }

    console.error("Erreur lors de l'ajout de la retenue:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
