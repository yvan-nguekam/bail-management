import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

// Schema de validation pour une demande de maintenance
const maintenanceSchema = z.object({
  propertyId: z.string().min(1, "La propriété est requise"),
  title: z.string().min(1, "Le titre est requis"),
  description: z.string().min(1, "La description est requise"),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  category: z.string().optional(),
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

    // Construire les filtres selon le rôle
    const where: any = {};

    if (session.user.role === "LANDLORD") {
      where.property = {
        ownerId: session.user.id,
      };
    } else if (session.user.role === "MANAGER") {
      where.property = {
        OR: [
          { ownerId: session.user.id },
          { managerId: session.user.id },
        ],
      };
    } else if (session.user.role === "TENANT") {
      where.tenantId = session.user.id;
    }
    // Les ADMIN voient tout

    if (status) {
      where.status = status;
    }

    if (priority) {
      where.priority = priority;
    }

    if (propertyId) {
      where.propertyId = propertyId;
    }

    const [requests, total] = await Promise.all([
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
    ]);

    return NextResponse.json({
      requests,
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
    const validatedData = maintenanceSchema.parse(body);

    // Vérifier que la propriété existe
    const property = await prisma.property.findUnique({
      where: { id: validatedData.propertyId },
      include: {
        owner: true,
        manager: true,
      },
    });

    if (!property) {
      return NextResponse.json(
        { error: "Propriété non trouvée" },
        { status: 404 }
      );
    }

    // Pour les locataires, vérifier qu'ils ont un bail actif sur cette propriété
    if (session.user.role === "TENANT") {
      const activeLease = await prisma.lease.findFirst({
        where: {
          propertyId: validatedData.propertyId,
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
    }

    const maintenanceRequest = await prisma.maintenanceRequest.create({
      data: {
        ...validatedData,
        tenantId: session.user.id,
        priority: validatedData.priority || "MEDIUM",
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

    // Créer une notification pour le propriétaire
    await prisma.notification.create({
      data: {
        userId: property.ownerId,
        type: "MAINTENANCE_REQUEST",
        title: "Nouvelle demande de maintenance",
        message: `${session.user.name} a créé une demande: ${maintenanceRequest.title}`,
        relatedId: maintenanceRequest.id,
      },
    });

    // Si un gestionnaire est assigné, lui envoyer aussi une notification
    if (property.managerId) {
      await prisma.notification.create({
        data: {
          userId: property.managerId,
          type: "MAINTENANCE_REQUEST",
          title: "Nouvelle demande de maintenance",
          message: `${session.user.name} a créé une demande: ${maintenanceRequest.title}`,
          relatedId: maintenanceRequest.id,
        },
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
