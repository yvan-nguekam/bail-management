import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const documentSchema = z.object({
  name: z.string().min(1, "Le nom est requis"),
  type: z.enum(["CONTRACT", "INVOICE", "RECEIPT", "REPORT", "OTHER"]),
  fileUrl: z.string().url("URL invalide"),
  fileSize: z.number().positive(),
  propertyId: z.string().optional(),
  leaseId: z.string().optional(),
});

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

    const where: any = {};

    if (session.user.role === "TENANT") {
      where.uploadedBy = session.user.id;
    }

    if (propertyId) {
      where.propertyId = propertyId;
    }

    if (leaseId) {
      where.leaseId = leaseId;
    }

    const documents = await prisma.document.findMany({
      where,
      include: {
        property: { select: { id: true, name: true } },
        lease: { select: { id: true } },
        uploadedByUser: { select: { id: true, name: true } },
      },
      orderBy: { uploadedAt: "desc" },
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

    const document = await prisma.document.create({
      data: {
        ...validatedData,
        uploadedBy: session.user.id,
      },
      include: {
        uploadedByUser: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(document, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Données invalides", details: error.errors },
        { status: 400 }
      );
    }
    console.error("Erreur:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
