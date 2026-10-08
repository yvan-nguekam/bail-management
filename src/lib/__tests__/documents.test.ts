/** @jest-environment node */
import {
  DOCUMENT_TYPES,
  canDeleteDocument,
  documentIconKind,
  documentTypeLabel,
  documentTypeLabels,
  formatFileSize,
  guessMimeType,
} from "../documents"

describe("libellés", () => {
  it("a un libellé français pour chaque type", () => {
    for (const t of DOCUMENT_TYPES) expect(documentTypeLabels[t]).toBeTruthy()
    expect(documentTypeLabel("CONTRACT")).toBe("Contrat")
    expect(documentTypeLabel("UNKNOWN")).toBe("UNKNOWN")
  })
})

describe("formatFileSize", () => {
  it("formate en octets, Ko, Mo et Go", () => {
    expect(formatFileSize(0)).toBe("—")
    expect(formatFileSize(512)).toBe("512 o")
    expect(formatFileSize(1024)).toBe("1 Ko")
    expect(formatFileSize(1536)).toBe("1,5 Ko")
    expect(formatFileSize(245 * 1024)).toBe("245 Ko")
    expect(formatFileSize(2.5 * 1024 * 1024)).toBe("2,5 Mo")
    expect(formatFileSize(3 * 1024 ** 3)).toBe("3 Go")
  })
})

describe("guessMimeType", () => {
  it("déduit le type MIME de l'extension", () => {
    expect(guessMimeType("https://x.test/contrat.PDF")).toBe("application/pdf")
    expect(guessMimeType("https://x.test/photo.jpg?size=large")).toBe("image/jpeg")
    expect(guessMimeType("https://x.test/export.xlsx")).toContain("spreadsheet")
    expect(guessMimeType("https://x.test/fichier")).toBe("application/octet-stream")
  })
})

describe("documentIconKind", () => {
  it("choisit la famille d'icône", () => {
    expect(documentIconKind("application/pdf")).toBe("pdf")
    expect(documentIconKind("image/png")).toBe("image")
    expect(documentIconKind("text/csv")).toBe("sheet")
    expect(documentIconKind("text/plain")).toBe("text")
    expect(documentIconKind("application/zip")).toBe("archive")
    expect(documentIconKind("application/octet-stream")).toBe("file")
  })
})

describe("canDeleteDocument", () => {
  const property = { ownerId: "owner", managerId: "manager" }

  it("autorise l'admin, l'auteur, le propriétaire et le gestionnaire", () => {
    const doc = { uploadedById: "tenant", property }
    expect(canDeleteDocument({ id: "admin", role: "ADMIN" }, doc)).toBe(true)
    expect(canDeleteDocument({ id: "tenant", role: "TENANT" }, doc)).toBe(true)
    expect(canDeleteDocument({ id: "owner", role: "LANDLORD" }, doc)).toBe(true)
    expect(canDeleteDocument({ id: "manager", role: "MANAGER" }, doc)).toBe(true)
    expect(canDeleteDocument({ id: "other", role: "LANDLORD" }, doc)).toBe(false)
  })

  it("remonte au bien via le bail", () => {
    const doc = { uploadedById: "tenant", lease: { property } }
    expect(canDeleteDocument({ id: "owner", role: "LANDLORD" }, doc)).toBe(true)
    expect(canDeleteDocument({ id: "other", role: "TENANT" }, doc)).toBe(false)
  })

  it("refuse les documents sans rattachement aux non-auteurs", () => {
    expect(canDeleteDocument({ id: "x", role: "LANDLORD" }, { uploadedById: "y" })).toBe(false)
  })
})
