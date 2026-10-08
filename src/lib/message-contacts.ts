import { prisma } from "@/lib/prisma"
import { collectContacts, sortContacts, type Contact } from "@/lib/messages"

type SessionUser = { id: string; role: string }

const contactSelect = { id: true, name: true, email: true, role: true } as const

/**
 * Personnes à qui l'utilisateur peut écrire.
 * - ADMIN : tout le monde (sauf lui-même).
 * - LANDLORD / MANAGER : locataires (tous baux) et co-responsable des biens possédés ou gérés.
 * - TENANT : propriétaire et gestionnaire des biens de ses baux.
 * Jamais la table utilisateurs entière pour un non-admin.
 */
export async function getContactsForUser(user: SessionUser): Promise<Contact[]> {
  if (user.role === "ADMIN") {
    const users = await prisma.user.findMany({
      where: { id: { not: user.id } },
      select: contactSelect,
      orderBy: { name: "asc" },
    })
    return sortContacts(users)
  }

  const propertyWhere =
    user.role === "TENANT"
      ? { leases: { some: { tenantId: user.id } } }
      : { OR: [{ ownerId: user.id }, { managerId: user.id }] }

  const properties = await prisma.property.findMany({
    where: propertyWhere,
    select: {
      owner: { select: contactSelect },
      manager: { select: contactSelect },
      leases: {
        // Un locataire ne voit pas les autres locataires du bien
        where: user.role === "TENANT" ? { tenantId: user.id } : undefined,
        select: { tenant: { select: contactSelect } },
      },
    },
  })

  return collectContacts(user.id, properties)
}

/** Vrai si `receiverId` fait partie des contacts autorisés de l'utilisateur. */
export async function canMessageUser(user: SessionUser, receiverId: string): Promise<boolean> {
  if (receiverId === user.id) return false
  const contacts = await getContactsForUser(user)
  return contacts.some((contact) => contact.id === receiverId)
}
