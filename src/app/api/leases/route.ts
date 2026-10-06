import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

// Schema de validation pour un bail
const leaseSchema = z.object({
  propertyId: z.string().min(1, "La propriété est requise"),
  tenantId: z.string().min(1, "Le locataire est requis"),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  monthlyRent: z.number().positive("Le loyer doit être positif"),
  securityDeposit: z.number().nonnegative("La caution doit être 0 ou plus"),
  terms: z.string().optional(),
});

// GET /api/leases - Liste tous les baux
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

    if (propertyId) {
      where.propertyId = propertyId;
    }

    const [leases, total] = await Promise.all([
      prisma.lease.findMany({
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
              type: true,
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
          payments: {
            where: {
              status: "PENDING",
            },
            select: {
              id: true,
              amount: true,
              dueDate: true,
            },
          },
        },
        orderBy: {
          startDate: "desc",
        },
      }),
      prisma.lease.count({ where }),
    ]);

    return NextResponse.json({
      leases,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Erreur lors de la récupération des baux:", error);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}

// POST /api/leases - Crée un nouveau bail
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: "Non authentifié" },
        { status: 401 }
      );
    }

    // Seuls les LANDLORD, MANAGER et ADMIN peuvent créer des baux
    if (!["LANDLORD", "MANAGER", "ADMIN"].includes(session.user.role)) {
      return NextResponse.json(
        { error: "Non autorisé" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validatedData = leaseSchema.parse(body);

    // Vérifier que la propriété existe et appartient à l'utilisateur
    const property = await prisma.property.findUnique({
      where: { id: validatedData.propertyId },
    });

    if (!property) {
      return NextResponse.json(
        { error: "Propriété non trouvée" },
        { status: 404 }
      );
    }

    const canCreateLease =
      session.user.role === "ADMIN" ||
      property.ownerId === session.user.id ||
      property.managerId === session.user.id;

    if (!canCreateLease) {
      return NextResponse.json(
        { error: "Non autorisé pour cette propriété" },
        { status: 403 }
      );
    }

    // Vérifier qu'il n'y a pas déjà un bail actif pour cette propriété
    const existingActiveLease = await prisma.lease.findFirst({
      where: {
        propertyId: validatedData.propertyId,
        status: "ACTIVE",
      },
    });

    if (existingActiveLease) {
      return NextResponse.json(
        { error: "Cette propriété a déjà un bail actif" },
        { status: 400 }
      );
    }

    // Convertir les dates
    const startDate = new Date(validatedData.startDate);
    const endDate = new Date(validatedData.endDate);

    // Vérifier que la date de fin est après la date de début
    if (endDate <= startDate) {
      return NextResponse.json(
        { error: "La date de fin doit être après la date de début" },
        { status: 400 }
      );
    }

    const lease = await prisma.lease.create({
      data: {
        ...validatedData,
        startDate,
        endDate,
        status: startDate <= new Date() ? "ACTIVE" : "DRAFT",
      },
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
      },
    });

    // Mettre à jour le statut de la propriété
    if (lease.status === "ACTIVE") {
      await prisma.property.update({
        where: { id: validatedData.propertyId },
        data: { status: "OCCUPIED" },
      });
    }

    // Créer une entrée d'activité
    await prisma.activity.create({
      data: {
        userId: session.user.id,
        action: "CREATE_LEASE",
        entityType: "LEASE",
        entityId: lease.id,
        details: `Bail créé pour ${property.name}`,
      },
    });

    // Créer une notification pour le locataire
    await prisma.notification.create({
      data: {
        userId: validatedData.tenantId,
        type: "LEASE_CREATED",
        title: "Nouveau bail",
        message: `Un nouveau bail a été créé pour ${property.name}`,
        relatedId: lease.id,
      },
    });

    return NextResponse.json(lease, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Données invalides", details: error.issues },
        { status: 400 }
      );
    }

    console.error("Erreur lors de la création du bail:", error);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}
