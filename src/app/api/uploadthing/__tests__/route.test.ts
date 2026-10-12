/** @jest-environment node */
// Route /api/uploadthing : comportement sans jeton et branchement des refus métier.

const getServerSession = jest.fn()
jest.mock("next-auth", () => ({ getServerSession: (...args: unknown[]) => getServerSession(...args) }))
jest.mock("@/lib/auth", () => ({ authOptions: {} }))
jest.mock("@/lib/prisma", () => ({
  prisma: {
    property: { findUnique: jest.fn(async () => null) },
  },
}))

import { NextRequest } from "next/server"

describe("/api/uploadthing sans UPLOADTHING_TOKEN", () => {
  const original = process.env.UPLOADTHING_TOKEN
  beforeEach(() => {
    delete process.env.UPLOADTHING_TOKEN
  })
  afterAll(() => {
    process.env.UPLOADTHING_TOKEN = original
  })

  it("répond 503 « Upload non configuré » en GET et POST", async () => {
    const { GET, POST } = await import("../route")
    const get = await GET(new NextRequest("http://localhost/api/uploadthing"))
    expect(get.status).toBe(503)
    expect(await get.json()).toMatchObject({ error: "Upload non configuré" })

    const post = await POST(
      new NextRequest("http://localhost/api/uploadthing?slug=avatar&actionType=upload", {
        method: "POST",
        body: JSON.stringify({ files: [] }),
      })
    )
    expect(post.status).toBe(503)
  })
})

describe("FileRouter : middleware", () => {
  type Middleware = (opts: { input?: unknown; files: unknown[]; req?: unknown }) => Promise<unknown>
  const middlewareOf = async (slug: string): Promise<Middleware> => {
    const { ourFileRouter } = await import("../core")
    const route = (ourFileRouter as unknown as Record<string, { middleware: Middleware }>)[slug]
    return route.middleware
  }

  it("refuse un utilisateur non connecté avec une UploadThingError FORBIDDEN", async () => {
    getServerSession.mockResolvedValue(null)
    for (const [slug, input] of [
      ["avatar", undefined],
      ["propertyImage", { propertyId: "p1" }],
      ["document", { type: "OTHER" }],
      ["maintenanceImage", { requestId: "r1" }],
    ] as const) {
      const middleware = await middlewareOf(slug)
      await expect(middleware({ input, files: [] })).rejects.toMatchObject({
        name: "UploadThingError",
        code: "FORBIDDEN",
        message: "Non authentifié",
      })
    }
  })

  it("renvoie NOT_FOUND pour un bien inexistant", async () => {
    getServerSession.mockResolvedValue({ user: { id: "u1", role: "LANDLORD" } })
    const middleware = await middlewareOf("propertyImage")
    await expect(middleware({ input: { propertyId: "nope" }, files: [{}] })).rejects.toMatchObject({
      code: "NOT_FOUND",
      message: "Bien introuvable",
    })
  })

  it("autorise l'avatar d'un utilisateur connecté", async () => {
    getServerSession.mockResolvedValue({ user: { id: "u1", role: "TENANT" } })
    const middleware = await middlewareOf("avatar")
    await expect(middleware({ files: [{}] })).resolves.toEqual({ userId: "u1" })
  })
})
