import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { deleteRemoteFiles } from "@/lib/remote-files"
import { uploadthingKeyFromUrl } from "@/lib/upload-config"

// DELETE /api/users/me/avatar - Retire la photo de profil (l'envoi passe par /api/uploadthing, route "avatar")
export async function DELETE() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { avatar: true },
    })
    if (!user) {
      return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 })
    }

    await prisma.user.update({ where: { id: session.user.id }, data: { avatar: null } })

    // La photo n'est renseignée que par l'envoi Uploadthing : suppression distante au mieux
    if (user.avatar) await deleteRemoteFiles([uploadthingKeyFromUrl(user.avatar)])

    return NextResponse.json({ avatar: null })
  } catch (error) {
    console.error("Erreur lors du retrait de la photo de profil:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
