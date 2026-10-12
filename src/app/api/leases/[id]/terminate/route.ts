import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { notify } from "@/lib/notify";
import { absoluteUrl, buildEmailSubject } from "@/lib/notification-preferences";
import { LeaseUpdateEmail } from "@/emails/lease-update";
import { syncLeaseSchedule } from "@/lib/lease-schedule";

const terminateSchema = z.object({
  terminationDate: z.string().datetime(),
  reason: z.string().optional(),
});

// POST /api/leases/[id]/terminate - Résilier un bail
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
    const canTerminate =
      session.user.role === "ADMIN" ||
      lease.property.ownerId === session.user.id ||
      lease.property.managerId === session.user.id;

    if (!canTerminate) {
      return NextResponse.json(
        { error: "Non autorisé" },
        { status: 403 }
      );
    }

    // Vérifier que le bail est actif
    if (lease.status !== "ACTIVE") {
      return NextResponse.json(
        { error: "Seuls les baux actifs peuvent être résiliés" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { terminationDate, reason } = terminateSchema.parse(body);

    const termDate = new Date(terminationDate);

    if (termDate < lease.startDate || termDate > lease.endDate) {
      return NextResponse.json(
        { error: "La date de résiliation doit être comprise dans la durée du bail" },
        { status: 400 }
      );
    }

    const updatedLease = await prisma.$transaction(async (tx) => {
      // Mettre à jour le bail
      const updatedLease = await tx.lease.update({
        where: { id },
        data: {
          status: "TERMINATED",
          endDate: termDate,
          terms: reason
            ? `${lease.terms || ""}\n\nRésiliation: ${reason}`
            : lease.terms,
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

      // Échéances impayées recalculées jusqu'à la date de résiliation (dernier mois au prorata)
      await syncLeaseSchedule(tx, updatedLease);

      // Mettre à jour le statut de la propriété
      await tx.property.update({
        where: { id: lease.propertyId },
        data: { status: "AVAILABLE" },
      });

      return updatedLease;
    });

    // Créer une notification pour le locataire
    await notify({
      userId: lease.tenantId,
      type: "LEASE_TERMINATED",
      title: "Résiliation de bail",
      message: `Votre bail pour ${lease.property.name} a été résilié`,
      relatedId: lease.id,
      link: `/leases/${lease.id}`,
      email: {
        subject: buildEmailSubject("Bail résilié", lease.property.name),
        react: (recipient) =>
          LeaseUpdateEmail({
            kind: "terminated",
            recipientName: recipient.name,
            propertyName: lease.property.name,
            endDate: termDate,
            reason,
            leaseUrl: absoluteUrl(`/leases/${lease.id}`),
          }),
      },
    });

    // Créer une entrée d'activité
    await prisma.activity.create({
      data: {
        userId: session.user.id,
        action: "TERMINATE_LEASE",
        entityType: "LEASE",
        entityId: lease.id,
        details: `Bail résilié pour ${lease.property.name}`,
      },
    });

    return NextResponse.json(updatedLease);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Données invalides", details: error.issues },
        { status: 400 }
      );
    }

    console.error("Erreur lors de la résiliation du bail:", error);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}
