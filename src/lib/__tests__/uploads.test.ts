/** @jest-environment node */
import {
  UploadAccessError,
  authorizeAvatarUpload,
  authorizeDocumentUpload,
  authorizeMaintenanceImageUpload,
  authorizePropertyImageUpload,
  documentUploadInput,
  maintenanceImageInput,
  propertyImageInput,
  requireUploadUser,
  saveAvatar,
  saveMaintenanceImage,
  savePropertyImage,
  saveUploadedDocument,
  type UploadDb,
  type UploadedFile,
} from "../uploads"
import { MAX_MAINTENANCE_IMAGES, MAX_PROPERTY_IMAGES } from "../upload-config"

// Fausse base : uniquement les méthodes utilisées par src/lib/uploads.ts
function fakeDb() {
  const state = {
    properties: {
      p1: { ownerId: "owner", managerId: "manager", images: [] as string[] },
      full: {
        ownerId: "owner",
        managerId: null,
        images: Array.from({ length: MAX_PROPERTY_IMAGES }, (_, i) => `https://x/${i}`),
      },
    } as Record<string, { ownerId: string; managerId: string | null; images: string[] }>,
    leases: {
      l1: { tenantId: "tenant", property: { ownerId: "owner", managerId: "manager" } },
    } as Record<string, { tenantId: string; property: { ownerId: string; managerId: string | null } }>,
    requests: {
      r1: {
        tenantId: "tenant",
        assignedToId: "tech",
        images: [] as string[],
        property: { ownerId: "owner", managerId: null },
      },
    } as Record<
      string,
      {
        tenantId: string
        assignedToId: string | null
        images: string[]
        property: { ownerId: string; managerId: string | null }
      }
    >,
    comments: {
      c1: { requestId: "r1", authorId: "tenant", images: [] as string[] },
      c2: { requestId: "other", authorId: "tenant", images: [] as string[] },
    } as Record<string, { requestId: string; authorId: string; images: string[] }>,
    users: { u1: { avatar: "https://app.ufs.sh/f/old-key" as string | null } } as Record<
      string,
      { avatar: string | null }
    >,
  }
  const byId =
    <T>(table: Record<string, T>) =>
    async ({ where }: { where: { id: string } }) =>
      table[where.id] ?? null

  const db = {
    property: { findUnique: jest.fn(byId(state.properties)), update: jest.fn(async () => ({})) },
    lease: { findUnique: jest.fn(byId(state.leases)) },
    document: {
      create: jest.fn(async ({ data }: { data: { name: string } }) => ({ id: "doc1", name: data.name })),
    },
    activity: { create: jest.fn(async () => ({})) },
    maintenanceRequest: { findUnique: jest.fn(byId(state.requests)), update: jest.fn(async () => ({})) },
    maintenanceComment: { findUnique: jest.fn(byId(state.comments)), update: jest.fn(async () => ({})) },
    user: { findUnique: jest.fn(byId(state.users)), update: jest.fn(async () => ({})) },
  }
  return db as typeof db & UploadDb
}

const session = (id: string, role = "LANDLORD") => ({ user: { id, role } })

const file: UploadedFile = {
  name: "bail.pdf",
  size: 1234,
  type: "application/pdf",
  key: "abc123",
  ufsUrl: "https://app.ufs.sh/f/abc123",
}

async function expectRefusal(promise: Promise<unknown> | (() => unknown), code: string) {
  const run = typeof promise === "function" ? Promise.resolve().then(promise) : promise
  await expect(run).rejects.toBeInstanceOf(UploadAccessError)
  await expect(run).rejects.toMatchObject({ code })
}

describe("requireUploadUser", () => {
  it("refuse une session absente ou incomplète", () => {
    for (const s of [null, undefined, {}, { user: null }, { user: { id: "u1" } }, { user: { role: "ADMIN" } }]) {
      expect(() => requireUploadUser(s)).toThrow("Non authentifié")
    }
  })

  it("renvoie l'utilisateur de la session", () => {
    expect(requireUploadUser(session("u1", "TENANT"))).toEqual({ id: "u1", role: "TENANT" })
  })
})

describe("schémas d'entrée", () => {
  it("exigent les identifiants et un type de document connu", () => {
    expect(propertyImageInput.safeParse({}).success).toBe(false)
    expect(propertyImageInput.safeParse({ propertyId: " " }).success).toBe(false)
    expect(maintenanceImageInput.safeParse({ requestId: "r1" }).success).toBe(true)
    expect(documentUploadInput.safeParse({ type: "CONTRACT" }).success).toBe(true)
    expect(documentUploadInput.safeParse({ type: "VIRUS" }).success).toBe(false)
    expect(documentUploadInput.safeParse({ type: "OTHER", name: "x".repeat(151) }).success).toBe(false)
  })
})

describe("propertyImage", () => {
  it("refuse sans session", async () => {
    await expectRefusal(
      authorizePropertyImageUpload(fakeDb(), null, { propertyId: "p1" }, 1),
      "UNAUTHORIZED"
    )
  })

  it("refuse un bien inexistant", async () => {
    await expectRefusal(
      authorizePropertyImageUpload(fakeDb(), session("owner"), { propertyId: "nope" }, 1),
      "NOT_FOUND"
    )
  })

  it("refuse un utilisateur qui ne gère pas le bien (même locataire)", async () => {
    await expectRefusal(
      authorizePropertyImageUpload(fakeDb(), session("tenant", "TENANT"), { propertyId: "p1" }, 1),
      "FORBIDDEN"
    )
  })

  it("autorise propriétaire, gestionnaire et admin", async () => {
    for (const s of [session("owner"), session("manager", "MANAGER"), session("root", "ADMIN")]) {
      await expect(
        authorizePropertyImageUpload(fakeDb(), s, { propertyId: "p1" }, 3)
      ).resolves.toEqual({ userId: s.user.id, propertyId: "p1" })
    }
  })

  it("refuse au-delà du nombre maximal de photos", async () => {
    await expectRefusal(
      authorizePropertyImageUpload(fakeDb(), session("owner"), { propertyId: "full" }, 1),
      "BAD_REQUEST"
    )
  })

  it("ajoute l'URL et la clé au bien", async () => {
    const db = fakeDb()
    const result = await savePropertyImage(db, { userId: "owner", propertyId: "p1" }, file)
    expect(result).toEqual({ url: file.ufsUrl })
    expect(db.property.update).toHaveBeenCalledWith({
      where: { id: "p1" },
      data: { images: { push: file.ufsUrl }, imageKeys: { push: "abc123" } },
    })
  })
})

describe("document", () => {
  it("refuse sans session", async () => {
    await expectRefusal(authorizeDocumentUpload(fakeDb(), null, { type: "OTHER" }), "UNAUTHORIZED")
  })

  it("applique les mêmes règles que POST /api/documents", async () => {
    await expectRefusal(
      authorizeDocumentUpload(fakeDb(), session("stranger"), { type: "OTHER", propertyId: "p1" }),
      "FORBIDDEN"
    )
    await expectRefusal(
      authorizeDocumentUpload(fakeDb(), session("tenant2", "TENANT"), { type: "OTHER", leaseId: "l1" }),
      "FORBIDDEN"
    )
    await expect(
      authorizeDocumentUpload(fakeDb(), session("tenant", "TENANT"), {
        type: "RECEIPT",
        leaseId: "l1",
        name: "  ",
      })
    ).resolves.toEqual({
      userId: "tenant",
      name: null,
      type: "RECEIPT",
      propertyId: null,
      leaseId: "l1",
    })
  })

  it("crée le document (nom du fichier par défaut, clé conservée) et journalise", async () => {
    const db = fakeDb()
    const result = await saveUploadedDocument(
      db,
      { userId: "owner", name: null, type: "CONTRACT", propertyId: "p1", leaseId: null },
      file
    )
    expect(result).toEqual({ documentId: "doc1" })
    expect(db.document.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          name: "bail.pdf",
          type: "CONTRACT",
          url: file.ufsUrl,
          fileKey: "abc123",
          size: 1234,
          mimeType: "application/pdf",
          propertyId: "p1",
          leaseId: null,
          uploadedById: "owner",
        },
      })
    )
    expect(db.activity.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: "owner",
        action: "CREATE_DOCUMENT",
        entityId: "doc1",
        details: "Document téléversé : bail.pdf",
      }),
    })
  })

  it("utilise le nom saisi et un type MIME générique si absent", async () => {
    const db = fakeDb()
    await saveUploadedDocument(
      db,
      { userId: "owner", name: "Contrat signé", type: "CONTRACT", propertyId: null, leaseId: null },
      { ...file, type: "" }
    )
    expect(db.document.create.mock.calls[0][0].data).toMatchObject({
      name: "Contrat signé",
      mimeType: "application/octet-stream",
    })
  })
})

describe("maintenanceImage", () => {
  it("refuse sans session, demande inexistante ou non-participant", async () => {
    await expectRefusal(authorizeMaintenanceImageUpload(fakeDb(), null, { requestId: "r1" }, 1), "UNAUTHORIZED")
    await expectRefusal(
      authorizeMaintenanceImageUpload(fakeDb(), session("tenant", "TENANT"), { requestId: "nope" }, 1),
      "NOT_FOUND"
    )
    await expectRefusal(
      authorizeMaintenanceImageUpload(fakeDb(), session("intruder", "TENANT"), { requestId: "r1" }, 1),
      "FORBIDDEN"
    )
  })

  it("autorise demandeur, intervenant, propriétaire et admin", async () => {
    for (const s of [
      session("tenant", "TENANT"),
      session("tech", "MANAGER"),
      session("owner"),
      session("root", "ADMIN"),
    ]) {
      await expect(
        authorizeMaintenanceImageUpload(fakeDb(), s, { requestId: "r1" }, 2)
      ).resolves.toEqual({ userId: s.user.id, requestId: "r1", commentId: null })
    }
  })

  it("n'autorise que l'auteur d'un commentaire de cette demande", async () => {
    await expect(
      authorizeMaintenanceImageUpload(fakeDb(), session("tenant", "TENANT"), { requestId: "r1", commentId: "c1" }, 1)
    ).resolves.toMatchObject({ commentId: "c1" })
    await expectRefusal(
      authorizeMaintenanceImageUpload(fakeDb(), session("owner"), { requestId: "r1", commentId: "c1" }, 1),
      "FORBIDDEN"
    )
    await expectRefusal(
      authorizeMaintenanceImageUpload(fakeDb(), session("tenant", "TENANT"), { requestId: "r1", commentId: "c2" }, 1),
      "NOT_FOUND"
    )
  })

  it("limite le nombre de photos", async () => {
    await expectRefusal(
      authorizeMaintenanceImageUpload(
        fakeDb(),
        session("tenant", "TENANT"),
        { requestId: "r1" },
        MAX_MAINTENANCE_IMAGES + 1
      ),
      "BAD_REQUEST"
    )
  })

  it("rattache la photo à la demande ou au commentaire", async () => {
    const db = fakeDb()
    await saveMaintenanceImage(db, { userId: "tenant", requestId: "r1", commentId: null }, file)
    expect(db.maintenanceRequest.update).toHaveBeenCalledWith({
      where: { id: "r1" },
      data: { images: { push: file.ufsUrl } },
    })
    await saveMaintenanceImage(db, { userId: "tenant", requestId: "r1", commentId: "c1" }, file)
    expect(db.maintenanceComment.update).toHaveBeenCalledWith({
      where: { id: "c1" },
      data: { images: { push: file.ufsUrl } },
    })
  })
})

describe("avatar", () => {
  it("refuse sans session", async () => {
    await expectRefusal(() => authorizeAvatarUpload(null), "UNAUTHORIZED")
    expect(authorizeAvatarUpload(session("u1"))).toEqual({ userId: "u1" })
  })

  it("enregistre la photo et renvoie la clé de l'ancienne", async () => {
    const db = fakeDb()
    const result = await saveAvatar(db, { userId: "u1" }, file)
    expect(db.user.update).toHaveBeenCalledWith({ where: { id: "u1" }, data: { avatar: file.ufsUrl } })
    expect(result).toEqual({ url: file.ufsUrl, previousKey: "old-key" })
  })

  it("aucune clé à supprimer si l'ancienne photo n'était pas sur Uploadthing", async () => {
    const db = fakeDb()
    db.user.findUnique.mockResolvedValueOnce({ avatar: "https://example.com/me.png" })
    await expect(saveAvatar(db, { userId: "u1" }, file)).resolves.toMatchObject({ previousKey: null })
  })
})
