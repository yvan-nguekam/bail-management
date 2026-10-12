/** @jest-environment node */
import {
  UPLOAD_LIMITS,
  describeLimits,
  isUploadEnabled,
  uploadthingKeyFromUrl,
  validateFiles,
} from "../upload-config"
import { isSameImageSet, removePropertyImage } from "../property-images"

const MB = 1024 * 1024
const makeFile = (name: string, type: string, size: number) =>
  new File([new Uint8Array(size)], name, { type })

describe("validateFiles", () => {
  it("accepte des fichiers conformes", () => {
    expect(validateFiles("propertyImage", [makeFile("a.jpg", "image/jpeg", 1000)])).toBeNull()
    expect(validateFiles("document", [makeFile("bail.pdf", "application/pdf", 10 * MB)])).toBeNull()
  })

  it("refuse un lot vide, trop de fichiers, un format ou une taille hors limites", () => {
    expect(validateFiles("avatar", [])).toBe("Aucun fichier sélectionné.")
    const two = [makeFile("a.png", "image/png", 10), makeFile("b.png", "image/png", 10)]
    expect(validateFiles("avatar", two)).toBe("Un seul fichier à la fois.")
    const six = Array.from({ length: 6 }, (_, i) => makeFile(`${i}.png`, "image/png", 10))
    expect(validateFiles("maintenanceImage", six)).toBe("5 fichiers maximum par envoi.")
    expect(validateFiles("propertyImage", [makeFile("x.pdf", "application/pdf", 10)])).toMatch(
      /format non accepté/
    )
    expect(validateFiles("avatar", [makeFile("big.jpg", "image/jpeg", 3 * MB)])).toBe(
      "« big.jpg » dépasse 2 Mo."
    )
  })

  it("décrit les limites en français", () => {
    expect(describeLimits("document")).toContain("16 Mo max")
    expect(describeLimits("propertyImage")).toContain("jusqu'à 10 fichiers")
    expect(UPLOAD_LIMITS.avatar.maxFileCount).toBe(1)
  })
})

describe("isUploadEnabled", () => {
  const original = process.env.NEXT_PUBLIC_UPLOAD_ENABLED
  afterEach(() => {
    process.env.NEXT_PUBLIC_UPLOAD_ENABLED = original
  })

  it("n'est actif que si NEXT_PUBLIC_UPLOAD_ENABLED vaut \"true\"", () => {
    process.env.NEXT_PUBLIC_UPLOAD_ENABLED = "true"
    expect(isUploadEnabled()).toBe(true)
    process.env.NEXT_PUBLIC_UPLOAD_ENABLED = "false"
    expect(isUploadEnabled()).toBe(false)
    delete process.env.NEXT_PUBLIC_UPLOAD_ENABLED
    expect(isUploadEnabled()).toBe(false)
  })
})

describe("uploadthingKeyFromUrl", () => {
  it("extrait la clé des URL Uploadthing", () => {
    expect(uploadthingKeyFromUrl("https://abc123.ufs.sh/f/KEY_1.jpg")).toBe("KEY_1.jpg")
    expect(uploadthingKeyFromUrl("https://utfs.io/f/xyz")).toBe("xyz")
  })

  it("ignore les autres hôtes et chemins", () => {
    expect(uploadthingKeyFromUrl("https://example.com/f/xyz")).toBeNull()
    expect(uploadthingKeyFromUrl("https://evil-ufs.sh.example.com/f/xyz")).toBeNull()
    expect(uploadthingKeyFromUrl("http://utfs.io/f/xyz")).toBeNull()
    expect(uploadthingKeyFromUrl("https://utfs.io/a/app/xyz")).toBeNull()
    expect(uploadthingKeyFromUrl("pas une url")).toBeNull()
  })
})

describe("photos d'un bien", () => {
  const uploaded = "https://app.ufs.sh/f/k1"
  const foreign = "https://app.ufs.sh/f/k-autre-bien"
  const manual = "https://example.com/photo.jpg"
  const state = { images: [uploaded, foreign, manual], imageKeys: ["k1"] }

  it("ne supprime à distance que les fichiers téléversés pour ce bien", () => {
    expect(removePropertyImage(state, uploaded)).toEqual({
      images: [foreign, manual],
      imageKeys: [],
      remoteKey: "k1",
    })
    // URL Uploadthing ajoutée à la main (clé absente d'imageKeys) : jamais supprimée à distance
    expect(removePropertyImage(state, foreign)?.remoteKey).toBeNull()
    expect(removePropertyImage(state, manual)).toEqual({
      images: [uploaded, foreign],
      imageKeys: ["k1"],
      remoteKey: null,
    })
    expect(removePropertyImage(state, "https://absente")).toBeNull()
  })

  it("n'accepte qu'une permutation des photos existantes", () => {
    expect(isSameImageSet(["a", "b", "c"], ["c", "a", "b"])).toBe(true)
    expect(isSameImageSet(["a", "b"], ["a", "c"])).toBe(false)
    expect(isSameImageSet(["a", "b"], ["a"])).toBe(false)
  })
})
