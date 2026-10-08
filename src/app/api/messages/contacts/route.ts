import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getContactsForUser } from "@/lib/message-contacts";

// GET /api/messages/contacts - Personnes à qui l'utilisateur peut écrire (périmètre par rôle)
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const contacts = await getContactsForUser(session.user);

    return NextResponse.json({ contacts });
  } catch (error) {
    console.error("Erreur:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
