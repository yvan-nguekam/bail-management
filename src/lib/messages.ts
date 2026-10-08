// Logique pure liée à la messagerie (contacts autorisés, accès, sujets de réponse).
// Aucune dépendance à Prisma/Next ici pour rester testable unitairement.

export interface Contact {
  id: string
  name: string
  email: string
  role: string
}

export interface ScopedProperty {
  owner: Contact
  manager: Contact | null
  leases: Array<{ tenant: Contact }>
}

/**
 * Contacts qu'un utilisateur peut écrire, à partir des biens dans son périmètre :
 * - locataire : propriétaire / gestionnaire des biens de ses baux ;
 * - propriétaire / gestionnaire : locataires de ses biens + l'autre responsable
 *   (gestionnaire ou propriétaire) des biens partagés.
 * L'utilisateur lui-même est toujours exclu ; résultat dédoublonné et trié par nom.
 */
export function collectContacts(userId: string, properties: ScopedProperty[]): Contact[] {
  const byId = new Map<string, Contact>()

  const add = (contact: Contact | null | undefined) => {
    if (contact && contact.id !== userId && !byId.has(contact.id)) {
      byId.set(contact.id, contact)
    }
  }

  for (const property of properties) {
    add(property.owner)
    add(property.manager)
    for (const lease of property.leases) add(lease.tenant)
  }

  return sortContacts([...byId.values()])
}

export function sortContacts(contacts: Contact[]): Contact[] {
  return [...contacts].sort((a, b) => a.name.localeCompare(b.name, "fr"))
}

export interface MessageParticipants {
  senderId: string
  receiverId: string
}

/** Seuls l'expéditeur et le destinataire peuvent lire un message. */
export function isMessageParticipant(userId: string, message: MessageParticipants): boolean {
  return message.senderId === userId || message.receiverId === userId
}

/** L'interlocuteur dans un échange, du point de vue de l'utilisateur courant. */
export function otherParticipant<T extends { id: string }>(
  userId: string,
  message: { sender: T; receiver: T }
): T {
  return message.sender.id === userId ? message.receiver : message.sender
}

/** "Re: Sujet" sans empiler les préfixes ("Re: Re: …"). */
export function replySubject(subject: string): string {
  const trimmed = subject.trim()
  return /^re\s*:/i.test(trimmed) ? trimmed : `Re: ${trimmed}`
}

/** Aperçu d'un message sur une ligne, sans sauts de ligne, tronqué proprement. */
export function excerpt(content: string, max = 90): string {
  const flat = content.replace(/\s+/g, " ").trim()
  if (flat.length <= max) return flat
  return `${flat.slice(0, max - 1).trimEnd()}…`
}
