import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { DOCUMENT_TYPES, guessMimeType } from "@/lib/documents";

// Taille et type MIME sont optionnels pour un document ajouté par lien
// (l'envoi de fichiers viendra avec une fonctionnalité ultérieure).
const documentSchema = z.object({
  name: z.string().trim().min(1, "Le nom est requis").max(150, "150 caractères maximum"),
  type: z.enum(DOCUMENT_TYPES),
  url: z.string().trim().url("URL invalide"),
  size: z.number().int().nonnegative().default(0),
  mimeType: z.string().min(1).optional(),
  propertyId: z.string().optional(),
  leaseId: z.string().optional(),
});

const documentInclude = {
  property: { select: { id: true, name: true } },
  lease: {
    select: {
      id: true,
      property: { select: { id: true, name: true } },
      tenant: { select: { id: true, name: true } },
    },
  },
  uploadedBy: { select: { id: true, name: true } },
} as const;

// GET /api/documents
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const propertyId = searchParams.get("propertyId");
    const leaseId = searchParams.get("leaseId");

    const where: Prisma.DocumentWhereInput = {};

    // Restreindre selon le rôle (les ADMIN voient tout)
    if (session.user.role === "TENANT") {
      where.OR = [
        { uploadedById: session.user.id },
        { lease: { tenantId: session.user.id } },
      ];
    } else if (session.user.role !== "ADMIN") {
      const ownedProperty = {
        OR: [{ ownerId: session.user.id }, { managerId: session.user.id }],
      };
      where.OR = [
        { uploadedById: session.user.id },
        { property: ownedProperty },
        { lease: { property: ownedProperty } },
      ];
    }

    if (propertyId) {
      where.propertyId = propertyId;
    }

    if (leaseId) {
      where.leaseId = leaseId;
    }

    const documents = await prisma.document.findMany({
      where,
      include: documentInclude,
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ documents });
  } catch (error) {
    console.error("Erreur:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// POST /api/documents
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = documentSchema.parse(body);

    // Vérifier l'accès au bien / bail rattaché
    const isAdmin = session.user.role === "ADMIN";
    if (validatedData.propertyId && !isAdmin) {
      const property = await prisma.property.findUnique({
        where: { id: validatedData.propertyId },
        select: { ownerId: true, managerId: true },
      });
      if (
        !property ||
        (property.ownerId !== session.user.id && property.managerId !== session.user.id)
      ) {
        return NextResponse.json({ error: "Non autorisé pour cette propriété" }, { status: 403 });
      }
    }
    if (validatedData.leaseId && !isAdmin) {
      const lease = await prisma.lease.findUnique({
        where: { id: validatedData.leaseId },
        select: { tenantId: true, property: { select: { ownerId: true, managerId: true } } },
      });
      if (
        !lease ||
        (lease.tenantId !== session.user.id &&
          lease.property.ownerId !== session.user.id &&
          lease.property.managerId !== session.user.id)
      ) {
        return NextResponse.json({ error: "Non autorisé pour ce bail" }, { status: 403 });
      }
    }

    const document = await prisma.document.create({
      data: {
        ...validatedData,
        mimeType: validatedData.mimeType ?? guessMimeType(validatedData.url),
        uploadedById: session.user.id,
      },
      include: documentInclude,
    });

    await prisma.activity.create({
      data: {
        userId: session.user.id,
        action: "CREATE_DOCUMENT",
        entityType: "DOCUMENT",
        entityId: document.id,
        details: `Document ajouté : ${document.name}`,
      },
    });

    return NextResponse.json(document, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Données invalides", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Erreur:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
