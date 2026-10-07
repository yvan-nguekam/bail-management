import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getDepositActionError } from "@/lib/deposit";
import {
  buildDepositSummary,
  canManageDeposit,
  loadDepositLease,
} from "@/lib/deposit-access";

// DELETE /api/leases/[id]/deposit/deductions/[deductionId] - Supprime une retenue
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; deductionId: string }> }
) {
  try {
    const { id, deductionId } = await params;
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

    const deduction = lease.depositDeductions.find((d) => d.id === deductionId);
    if (!deduction) {
      return NextResponse.json({ error: "Retenue non trouvée" }, { status: 404 });
    }

    const stateError = getDepositActionError("removeDeduction", {
      leaseStatus: lease.status,
      depositStatus: lease.depositStatus,
    });
    if (stateError) {
      return NextResponse.json({ error: stateError }, { status: 400 });
    }

    await prisma.depositDeduction.delete({ where: { id: deductionId } });

    await prisma.activity.create({
      data: {
        userId: session.user.id,
        action: "REMOVE_DEPOSIT_DEDUCTION",
        entityType: "LEASE",
        entityId: id,
        details: `Retenue sur caution « ${deduction.label} » supprimée pour ${lease.property.name}`,
      },
    });

    const updated = await loadDepositLease(id);
    return NextResponse.json(buildDepositSummary(updated!, session.user));
  } catch (error) {
    console.error("Erreur lors de la suppression de la retenue:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
