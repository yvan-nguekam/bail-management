import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { notify } from "@/lib/notify";
import { absoluteUrl, buildEmailSubject } from "@/lib/notification-preferences";
import { LeaseUpdateEmail } from "@/emails/lease-update";
import { syncLeaseSchedule } from "@/lib/lease-schedule";
import { addUtcDays } from "@/lib/payment-schedule";

const renewSchema = z.object({
  newEndDate: z.string().datetime(),
  newMonthlyRent: z.number().positive().optional(),
  terms: z.string().optional(),
});

// POST /api/leases/[id]/renew - Renouveler un bail
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

    const lease = await prisma.lease.findUnique({
      where: { id },
      include: {
        property: true,
        tenant: {
          select: {
            id: true,
            name: true,
            email: true,
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

    // Vérifier les permissions
    const canRenew =
      session.user.role === "ADMIN" ||
      lease.property.ownerId === session.user.id ||
      lease.property.managerId === session.user.id;

    if (!canRenew) {
      return NextResponse.json(
        { error: "Non autorisé" },
        { status: 403 }
      );
    }

    // Vérifier que le bail peut être renouvelé
    if (!["ACTIVE", "EXPIRED"].includes(lease.status)) {
      return NextResponse.json(
        { error: "Ce bail ne peut pas être renouvelé" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { newEndDate, newMonthlyRent, terms } = renewSchema.parse(body);

    const endDate = new Date(newEndDate);
    // Le nouveau bail prend la suite de l'ancien, sans chevauchement d'échéances
    const startDate = addUtcDays(lease.endDate, 1);

    // Vérifier que la nouvelle date de fin est après la date actuelle
    if (endDate <= new Date()) {
      return NextResponse.json(
        { error: "La nouvelle date de fin doit être dans le futur" },
        { status: 400 }
      );
    }

    if (endDate < startDate) {
      return NextResponse.json(
        { error: "La nouvelle date de fin doit être après la fin du bail actuel" },
        { status: 400 }
      );
    }

    const newLease = await prisma.$transaction(async (tx) => {
      // Marquer l'ancien bail comme renouvelé
      await tx.lease.update({
        where: { id },
        data: {
          status: "RENEWED",
        },
      });

      // Créer un nouveau bail
      const newLease = await tx.lease.create({
        data: {
          propertyId: lease.propertyId,
          tenantId: lease.tenantId,
          startDate,
          endDate: endDate,
          monthlyRent: newMonthlyRent || lease.monthlyRent,
          securityDeposit: lease.securityDeposit,
          // La caution encore détenue est reportée sur le nouveau bail
          ...(lease.depositStatus === "HELD" && {
            depositStatus: lease.depositStatus,
            depositReceivedAmount: lease.depositReceivedAmount,
            depositReceivedAt: lease.depositReceivedAt,
            depositPaymentMethod: lease.depositPaymentMethod,
            depositReference: lease.depositReference,
          }),
          paymentDay: lease.paymentDay,
          terms: terms || `Renouvellement du bail #${lease.id}`,
          status: "ACTIVE",
        },
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
      });

      await syncLeaseSchedule(tx, newLease);

      // Les éventuelles retenues sur caution suivent la caution
      if (lease.depositStatus === "HELD") {
        await tx.depositDeduction.updateMany({
          where: { leaseId: id },
          data: { leaseId: newLease.id },
        });
      }

      return newLease;
    });

    // Créer une notification pour le locataire
    await notify({
      userId: lease.tenantId,
      type: "LEASE_RENEWED",
      title: "Bail renouvelé",
      message: `Votre bail pour ${lease.property.name} a été renouvelé`,
      relatedId: newLease.id,
      link: `/leases/${newLease.id}`,
      email: {
        subject: buildEmailSubject("Bail renouvelé", lease.property.name),
        react: (recipient) =>
          LeaseUpdateEmail({
            kind: "renewed",
            recipientName: recipient.name,
            propertyName: lease.property.name,
            startDate: newLease.startDate,
            endDate: newLease.endDate,
            monthlyRent: newLease.monthlyRent,
            leaseUrl: absoluteUrl(`/leases/${newLease.id}`),
          }),
      },
    });

    // Créer une entrée d'activité
    await prisma.activity.create({
      data: {
        userId: session.user.id,
        action: "RENEW_LEASE",
        entityType: "LEASE",
        entityId: newLease.id,
        details: `Bail renouvelé pour ${lease.property.name}`,
      },
    });

    return NextResponse.json(newLease);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Données invalides", details: error.issues },
        { status: 400 }
      );
    }

    console.error("Erreur lors du renouvellement du bail:", error);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}
