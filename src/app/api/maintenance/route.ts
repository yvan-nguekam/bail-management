import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import {
  MAINTENANCE_STATUSES,
  canManageProperty,
  isMaintenancePriority,
  isMaintenanceStatus,
} from "@/lib/maintenance";

// Schema de validation pour une demande de maintenance
const maintenanceSchema = z.object({
  propertyId: z.string().min(1, "La propriété est requise"),
  title: z.string().min(1, "Le titre est requis"),
  description: z.string().min(1, "La description est requise"),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  category: z.string().optional(),
  // Réservé aux propriétaires/gestionnaires/admins : locataire pour le compte duquel
  // la demande est ouverte. Ignoré pour un locataire (toujours lui-même).
  tenantId: z.string().min(1).optional(),
});

// GET /api/maintenance - Liste toutes les demandes de maintenance
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
    const priority = searchParams.get("priority");
    const propertyId = searchParams.get("propertyId");

    const skip = (page - 1) * limit;

    // Périmètre selon le rôle. Un intervenant assigné voit aussi les demandes
    // qui lui sont confiées (cohérent avec GET /api/maintenance/[id]).
    const scope: Prisma.MaintenanceRequestWhereInput = {};

    if (session.user.role === "LANDLORD") {
      scope.OR = [
        { property: { ownerId: session.user.id } },
        { assignedToId: session.user.id },
      ];
    } else if (session.user.role === "MANAGER") {
      scope.OR = [
        { property: { ownerId: session.user.id } },
        { property: { managerId: session.user.id } },
        { assignedToId: session.user.id },
      ];
    } else if (session.user.role === "TENANT") {
      scope.tenantId = session.user.id;
    }
    // Les ADMIN voient tout

    const where: Prisma.MaintenanceRequestWhereInput = { ...scope };

    // Les valeurs invalides sont ignorées (sinon Prisma lève une erreur 500)
    if (isMaintenanceStatus(status)) {
      where.status = status;
    }

    if (isMaintenancePriority(priority)) {
      where.priority = priority;
    }

    if (propertyId) {
      where.propertyId = propertyId;
    }

    const [requests, total, statusGroups] = await Promise.all([
      prisma.maintenanceRequest.findMany({
        where,
        skip,
        take: limit,
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
          assignedTo: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          comments: {
            select: {
              id: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      }),
      prisma.maintenanceRequest.count({ where }),
      // Compteurs par statut sur tout le périmètre de l'utilisateur (hors filtres)
      prisma.maintenanceRequest.groupBy({
        by: ["status"],
        where: scope,
        _count: { _all: true },
      }),
    ]);

    const stats = Object.fromEntries(
      MAINTENANCE_STATUSES.map((s) => [
        s,
        statusGroups.find((g) => g.status === s)?._count._all ?? 0,
      ])
    );

    return NextResponse.json({
      requests,
      stats,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Erreur lors de la récupération des demandes:", error);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}

// POST /api/maintenance - Crée une nouvelle demande
// - TENANT : sur une propriété où il a un bail actif, en son nom.
// - LANDLORD / MANAGER : sur une propriété qu'ils possèdent ou gèrent (ADMIN : toutes),
//   en leur nom ou pour le compte d'un locataire ayant un bail actif (champ tenantId).
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: "Non authentifié" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { tenantId: requestedTenantId, ...requestData } =
      maintenanceSchema.parse(body);

    // Vérifier que la propriété existe
    const property = await prisma.property.findUnique({
      where: { id: requestData.propertyId },
      select: { id: true, ownerId: true, managerId: true },
    });

    if (!property) {
      return NextResponse.json(
        { error: "Propriété non trouvée" },
        { status: 404 }
      );
    }

    // Demandeur enregistré dans le champ tenantId du modèle
    let requesterId = session.user.id;

    if (session.user.role === "TENANT") {
      // Un locataire doit avoir un bail actif sur cette propriété
      const activeLease = await prisma.lease.findFirst({
        where: {
          propertyId: requestData.propertyId,
          tenantId: session.user.id,
          status: "ACTIVE",
        },
      });

      if (!activeLease) {
        return NextResponse.json(
          { error: "Vous n'avez pas de bail actif sur cette propriété" },
          { status: 403 }
        );
      }
    } else {
      if (!canManageProperty(session.user, property)) {
        return NextResponse.json(
          { error: "Non autorisé pour cette propriété" },
          { status: 403 }
        );
      }

      // Pour le compte d'un locataire : il doit avoir un bail actif sur le bien
      if (requestedTenantId && requestedTenantId !== session.user.id) {
        const tenantLease = await prisma.lease.findFirst({
          where: {
            propertyId: requestData.propertyId,
            tenantId: requestedTenantId,
            status: "ACTIVE",
          },
        });

        if (!tenantLease) {
          return NextResponse.json(
            { error: "Ce locataire n'a pas de bail actif sur cette propriété" },
            { status: 400 }
          );
        }
        requesterId = requestedTenantId;
      }
    }

    const maintenanceRequest = await prisma.maintenanceRequest.create({
      data: {
        ...requestData,
        tenantId: requesterId,
        priority: requestData.priority || "MEDIUM",
        status: "OPEN",
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

    // Créer une entrée d'activité
    await prisma.activity.create({
      data: {
        userId: session.user.id,
        action: "CREATE_MAINTENANCE_REQUEST",
        entityType: "MAINTENANCE_REQUEST",
        entityId: maintenanceRequest.id,
        details: `Demande créée: ${maintenanceRequest.title}`,
      },
    });

    // Notifier le propriétaire, le gestionnaire et, si la demande a été ouverte
    // pour son compte, le locataire — jamais l'auteur lui-même
    const recipients = new Set(
      [property.ownerId, property.managerId, requesterId].filter(
        (id): id is string => !!id && id !== session.user.id
      )
    );

    if (recipients.size > 0) {
      await prisma.notification.createMany({
        data: [...recipients].map((userId) => ({
          userId,
          type: "MAINTENANCE_REQUEST" as const,
          title: "Nouvelle demande de maintenance",
          message: `${session.user.name} a créé une demande: ${maintenanceRequest.title}`,
          relatedId: maintenanceRequest.id,
          link: `/maintenance/${maintenanceRequest.id}`,
        })),
      });
    }

    return NextResponse.json(maintenanceRequest, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Données invalides", details: error.issues },
        { status: 400 }
      );
    }

    console.error("Erreur lors de la création de la demande:", error);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}
