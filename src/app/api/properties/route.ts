import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

// Schema de validation pour une propriété
const propertySchema = z.object({
  name: z.string().min(1, "Le nom est requis"),
  address: z.string().min(1, "L'adresse est requise"),
  city: z.string().min(1, "La ville est requise"),
  postalCode: z.string().min(1, "Le code postal est requis"),
  country: z.string().min(1, "Le pays est requis"),
  type: z.enum(["APARTMENT", "HOUSE", "STUDIO", "COMMERCIAL", "OFFICE", "OTHER"]),
  bedrooms: z.number().int().min(0),
  bathrooms: z.number().int().min(0),
  area: z.number().positive(),
  description: z.string().optional(),
  monthlyRent: z.number().positive(),
  securityDeposit: z.number().nonnegative(),
  availableFrom: z.string().datetime(),
  images: z.array(z.string()).optional(),
  amenities: z.array(z.string()).optional(),
  managerId: z.string().optional(),
});

// GET /api/properties - Liste toutes les propriétés de l'utilisateur
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
    const type = searchParams.get("type");

    const skip = (page - 1) * limit;

    // Construire les filtres selon le rôle
    const where: any = {};

    if (session.user.role === "LANDLORD") {
      where.ownerId = session.user.id;
    } else if (session.user.role === "MANAGER") {
      where.OR = [
        { ownerId: session.user.id },
        { managerId: session.user.id },
      ];
    } else if (session.user.role === "TENANT") {
      // Les locataires ne voient que leur propriété via leur bail
      where.leases = {
        some: {
          tenantId: session.user.id,
          status: "ACTIVE",
        },
      };
    }
    // Les ADMIN voient tout

    if (status) {
      where.status = status;
    }

    if (type) {
      where.type = type;
    }

    const [properties, total] = await Promise.all([
      prisma.property.findMany({
        where,
        skip,
        take: limit,
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
          leases: {
            // Un locataire ne voit que son propre bail (pas les co-locataires)
            where:
              session.user.role === "TENANT"
                ? { status: "ACTIVE", tenantId: session.user.id }
                : { status: "ACTIVE" },
            include: {
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
        orderBy: {
          createdAt: "desc",
        },
      }),
      prisma.property.count({ where }),
    ]);

    return NextResponse.json({
      properties,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Erreur lors de la récupération des propriétés:", error);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}

// POST /api/properties - Crée une nouvelle propriété
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: "Non authentifié" },
        { status: 401 }
      );
    }

    // Seuls les LANDLORD, MANAGER et ADMIN peuvent créer des propriétés
    if (!["LANDLORD", "MANAGER", "ADMIN"].includes(session.user.role)) {
      return NextResponse.json(
        { error: "Non autorisé" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validatedData = propertySchema.parse(body);

    // Le gestionnaire désigné doit être un compte MANAGER existant
    if (validatedData.managerId) {
      const manager = await prisma.user.findUnique({
        where: { id: validatedData.managerId },
        select: { role: true },
      });
      if (manager?.role !== "MANAGER") {
        return NextResponse.json({ error: "Gestionnaire invalide" }, { status: 400 });
      }
    }

    // Convertir la date string en Date
    const availableFromDate = new Date(validatedData.availableFrom);

    const property = await prisma.property.create({
      data: {
        ...validatedData,
        availableFrom: availableFromDate,
        ownerId: session.user.id,
      },
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
        action: "CREATE_PROPERTY",
        entityType: "PROPERTY",
        entityId: property.id,
        details: `Propriété créée: ${property.name}`,
      },
    });

    return NextResponse.json(property, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Données invalides", details: error.issues },
        { status: 400 }
      );
    }

    console.error("Erreur lors de la création de la propriété:", error);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}
