/** @jest-environment node */
import {
  collectContacts,
  excerpt,
  isMessageParticipant,
  otherParticipant,
  replySubject,
} from "../messages"

const owner = { id: "owner", name: "Yvan", email: "o@test.com", role: "LANDLORD" }
const manager = { id: "manager", name: "Marc", email: "m@test.com", role: "MANAGER" }
const tenantA = { id: "tA", name: "Fabrice", email: "a@test.com", role: "TENANT" }
const tenantB = { id: "tB", name: "Claire", email: "b@test.com", role: "TENANT" }

const properties = [
  { owner, manager, leases: [{ tenant: tenantA }, { tenant: tenantA }] },
  { owner, manager: null, leases: [{ tenant: tenantB }] },
]

describe("collectContacts", () => {
  it("exclut l'utilisateur courant et dédoublonne", () => {
    const ids = collectContacts(owner.id, properties).map((c) => c.id)
    expect(ids).not.toContain("owner")
    expect(ids.filter((id) => id === "tA")).toHaveLength(1)
    expect(ids).toEqual(expect.arrayContaining(["manager", "tA", "tB"]))
  })

  it("donne au locataire le propriétaire et le gestionnaire de son bien", () => {
    const ids = collectContacts(tenantA.id, [properties[0]]).map((c) => c.id)
    expect(ids).toEqual(["manager", "owner"])
  })

  it("trie par nom", () => {
    const names = collectContacts(owner.id, properties).map((c) => c.name)
    expect(names).toEqual(["Claire", "Fabrice", "Marc"])
  })

  it("renvoie une liste vide sans bien dans le périmètre", () => {
    expect(collectContacts("x", [])).toEqual([])
  })
})

describe("accès aux messages", () => {
  const message = { senderId: "a", receiverId: "b" }

  it("n'autorise que les participants", () => {
    expect(isMessageParticipant("a", message)).toBe(true)
    expect(isMessageParticipant("b", message)).toBe(true)
    expect(isMessageParticipant("c", message)).toBe(false)
  })

  it("identifie l'interlocuteur", () => {
    const m = { sender: { id: "a" }, receiver: { id: "b" } }
    expect(otherParticipant("a", m).id).toBe("b")
    expect(otherParticipant("b", m).id).toBe("a")
  })
})

describe("replySubject", () => {
  it("préfixe par Re: une seule fois", () => {
    expect(replySubject("Fuite d'eau")).toBe("Re: Fuite d'eau")
    expect(replySubject("Re: Fuite d'eau")).toBe("Re: Fuite d'eau")
    expect(replySubject("RE : Loyer")).toBe("RE : Loyer")
  })
})

describe("excerpt", () => {
  it("aplatit les sauts de ligne et tronque", () => {
    expect(excerpt("Bonjour,\n\nvoici  un message")).toBe("Bonjour, voici un message")
    const long = "a".repeat(200)
    expect(excerpt(long, 20)).toHaveLength(20)
    expect(excerpt(long, 20).endsWith("…")).toBe(true)
  })
})
