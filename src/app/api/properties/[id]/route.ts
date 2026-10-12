import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

// Schema de validation pour mise à jour
const updatePropertySchema = z.object({
  name: z.string().min(1).optional(),
  address: z.string().min(1).optional(),
  city: z.string().min(1).optional(),
  postalCode: z.string().min(1).optional(),
  country: z.string().min(1).optional(),
  type: z.enum(["APARTMENT", "HOUSE", "STUDIO", "COMMERCIAL", "OFFICE", "OTHER"]).optional(),
  bedrooms: z.number().int().min(0).optional(),
  bathrooms: z.number().int().min(0).optional(),
  area: z.number().positive().optional(),
  description: z.string().optional(),
  monthlyRent: z.number().positive().optional(),
  securityDeposit: z.number().nonnegative().optional(),
  status: z.enum(["AVAILABLE", "OCCUPIED", "MAINTENANCE", "UNAVAILABLE"]).optional(),
  availableFrom: z.string().datetime().optional(),
  images: z.array(z.string()).optional(),
  amenities: z.array(z.string()).optional(),
  managerId: z.string().nullable().optional(),
});

// GET /api/properties/[id] - Récupère une propriété par ID
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

    const property = await prisma.property.findUnique({
      where: { id },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        manager: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        leases: {
          include: {
            tenant: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
              },
            },
          },
          orderBy: {
            startDate: "desc",
          },
        },
        maintenanceRequests: {
          orderBy: {
            createdAt: "desc",
          },
          take: 5,
        },
      },
    });

    if (!property) {
      return NextResponse.json(
        { error: "Propriété non trouvée" },
        { status: 404 }
      );
    }

    // Vérifier les permissions
    const canView =
      session.user.role === "ADMIN" ||
      property.ownerId === session.user.id ||
      property.managerId === session.user.id ||
      (session.user.role === "TENANT" &&
        property.leases.some(
          (lease) =>
            lease.tenantId === session.user.id && lease.status === "ACTIVE"
        ));

    if (!canView) {
      return NextResponse.json(
        { error: "Non autorisé" },
        { status: 403 }
      );
    }

    // Un locataire ne voit que ses propres baux et demandes (pas les coordonnées des autres)
    if (
      session.user.role === "TENANT" &&
      property.ownerId !== session.user.id &&
      property.managerId !== session.user.id
    ) {
      return NextResponse.json({
        ...property,
        leases: property.leases.filter((lease) => lease.tenantId === session.user.id),
        maintenanceRequests: property.maintenanceRequests.filter(
          (request) => request.tenantId === session.user.id
        ),
      });
    }

    return NextResponse.json(property);
  } catch (error) {
    console.error("Erreur lors de la récupération de la propriété:", error);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}

// PUT /api/properties/[id] - Met à jour une propriété
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

    // Vérifier que la propriété existe
    const existingProperty = await prisma.property.findUnique({
      where: { id },
    });

    if (!existingProperty) {
      return NextResponse.json(
        { error: "Propriété non trouvée" },
        { status: 404 }
      );
    }

    // Vérifier les permissions
    const canEdit =
      session.user.role === "ADMIN" ||
      existingProperty.ownerId === session.user.id ||
      existingProperty.managerId === session.user.id;

    if (!canEdit) {
      return NextResponse.json(
        { error: "Non autorisé" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validatedData = updatePropertySchema.parse(body);

    // Seuls l'admin et le propriétaire désignent le gestionnaire, qui doit être un compte MANAGER
    if (validatedData.managerId !== undefined && validatedData.managerId !== existingProperty.managerId) {
      if (session.user.role !== "ADMIN" && existingProperty.ownerId !== session.user.id) {
        return NextResponse.json(
          { error: "Seul le propriétaire peut changer le gestionnaire" },
          { status: 403 }
        );
      }
      if (validatedData.managerId && !(await isManagerAccount(validatedData.managerId))) {
        return NextResponse.json({ error: "Gestionnaire invalide" }, { status: 400 });
      }
    }

    // Convertir la date si présente
    const updateData: any = { ...validatedData };
    if (validatedData.availableFrom) {
      updateData.availableFrom = new Date(validatedData.availableFrom);
    }

    const property = await prisma.property.update({
      where: { id },
      data: updateData,
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        manager: {
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
        action: "UPDATE_PROPERTY",
        entityType: "PROPERTY",
        entityId: property.id,
        details: `Propriété mise à jour: ${property.name}`,
      },
    });

    return NextResponse.json(property);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Données invalides", details: error.issues },
        { status: 400 }
      );
    }

    console.error("Erreur lors de la mise à jour de la propriété:", error);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}

// DELETE /api/properties/[id] - Supprime une propriété
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

    // Vérifier que la propriété existe
    const existingProperty = await prisma.property.findUnique({
      where: { id },
      include: {
        leases: {
          where: {
            status: "ACTIVE",
          },
        },
      },
    });

    if (!existingProperty) {
      return NextResponse.json(
        { error: "Propriété non trouvée" },
        { status: 404 }
      );
    }

    // Vérifier les permissions
    const canDelete =
      session.user.role === "ADMIN" ||
      existingProperty.ownerId === session.user.id;

    if (!canDelete) {
      return NextResponse.json(
        { error: "Non autorisé" },
        { status: 403 }
      );
    }

    // Empêcher la suppression si la propriété a des baux actifs
    if (existingProperty.leases.length > 0) {
      return NextResponse.json(
        {
          error:
            "Impossible de supprimer une propriété avec des baux actifs",
        },
        { status: 400 }
      );
    }

    await prisma.property.delete({
      where: { id },
    });

    // Créer une entrée d'activité
    await prisma.activity.create({
      data: {
        userId: session.user.id,
        action: "DELETE_PROPERTY",
        entityType: "PROPERTY",
        entityId: id,
        details: `Propriété supprimée: ${existingProperty.name}`,
      },
    });

    return NextResponse.json({ message: "Propriété supprimée avec succès" });
  } catch (error) {
    console.error("Erreur lors de la suppression de la propriété:", error);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}

async function isManagerAccount(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  return user?.role === "MANAGER";
}
