import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { z } from "zod"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { deleteRemoteFiles } from "@/lib/remote-files"
import { isSameImageSet, removePropertyImage } from "@/lib/property-images"

// Photos d'un bien : retrait (DELETE) et réordonnancement (PUT). L'ajout passe par
// l'envoi de fichiers (/api/uploadthing, route "propertyImage").

const removeSchema = z.object({ url: z.string().min(1) })
const reorderSchema = z.object({ images: z.array(z.string().min(1)).max(100) })

async function loadEditableProperty(id: string) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return { error: NextResponse.json({ error: "Non authentifié" }, { status: 401 }) }
  }
  const property = await prisma.property.findUnique({
    where: { id },
    select: { id: true, ownerId: true, managerId: true, images: true, imageKeys: true },
  })
  if (!property) {
    return { error: NextResponse.json({ error: "Propriété non trouvée" }, { status: 404 }) }
  }
  const canEdit =
    session.user.role === "ADMIN" ||
    property.ownerId === session.user.id ||
    property.managerId === session.user.id
  if (!canEdit) {
    return { error: NextResponse.json({ error: "Non autorisé" }, { status: 403 }) }
  }
  return { property }
}

// DELETE /api/properties/[id]/images - Retire une photo { url }
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const loaded = await loadEditableProperty(id)
    if (loaded.error) return loaded.error
    const { url } = removeSchema.parse(await request.json())

    const next = removePropertyImage(loaded.property, url)
    if (!next) {
      return NextResponse.json({ error: "Photo introuvable" }, { status: 404 })
    }

    const updated = await prisma.property.update({
      where: { id },
      data: { images: next.images, imageKeys: next.imageKeys },
      select: { images: true },
    })

    // Suppression distante au mieux, après l'écriture en base
    await deleteRemoteFiles([next.remoteKey])

    return NextResponse.json({ images: updated.images })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Données invalides" }, { status: 400 })
    }
    console.error("Erreur lors du retrait de la photo:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}

// PUT /api/properties/[id]/images - Nouvel ordre { images } (la première sert de couverture)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const loaded = await loadEditableProperty(id)
    if (loaded.error) return loaded.error
    const { images } = reorderSchema.parse(await request.json())

    if (!isSameImageSet(loaded.property.images, images)) {
      return NextResponse.json(
        { error: "La liste des photos a changé, rechargez la page" },
        { status: 409 }
      )
    }

    const updated = await prisma.property.update({
      where: { id },
      data: { images },
      select: { images: true },
    })
    return NextResponse.json({ images: updated.images })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Données invalides" }, { status: 400 })
    }
    console.error("Erreur lors du réordonnancement des photos:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
