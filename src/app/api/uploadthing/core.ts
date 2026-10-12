import { getServerSession } from "next-auth"
import { createUploadthing, type FileRouter } from "uploadthing/next"
import { UploadThingError } from "uploadthing/server"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { deleteRemoteFiles } from "@/lib/remote-files"
import { UPLOAD_LIMITS } from "@/lib/upload-config"
import {
  UploadAccessError,
  authorizeAvatarUpload,
  authorizeDocumentUpload,
  authorizeMaintenanceImageUpload,
  authorizePropertyImageUpload,
  documentUploadInput,
  maintenanceImageInput,
  propertyImageInput,
  saveAvatar,
  saveMaintenanceImage,
  savePropertyImage,
  saveUploadedDocument,
} from "@/lib/uploads"

// Routes d'envoi Uploadthing. Le contrôle d'accès et les écritures en base sont dans
// src/lib/uploads.ts (testés unitairement) ; ce fichier ne fait que les brancher.

const f = createUploadthing()

/** Convertit un refus métier en erreur Uploadthing (le message est renvoyé au client). */
async function guard<T>(fn: () => Promise<T> | T): Promise<T> {
  try {
    return await fn()
  } catch (error) {
    if (error instanceof UploadAccessError) {
      throw new UploadThingError({
        code: error.code === "UNAUTHORIZED" ? "FORBIDDEN" : error.code,
        message: error.message,
      })
    }
    throw error
  }
}

const image = (endpoint: "propertyImage" | "maintenanceImage" | "avatar", size: "2MB" | "4MB") => ({
  image: { maxFileSize: size, maxFileCount: UPLOAD_LIMITS[endpoint].maxFileCount },
})

const doc = { maxFileSize: "16MB", maxFileCount: 1 } as const

export const ourFileRouter = {
  propertyImage: f(image("propertyImage", "4MB"))
    .input(propertyImageInput)
    .middleware(({ input, files }) =>
      guard(async () =>
        authorizePropertyImageUpload(prisma, await getServerSession(authOptions), input, files.length)
      )
    )
    .onUploadComplete(({ metadata, file }) => savePropertyImage(prisma, metadata, file)),

  document: f({
    pdf: doc,
    image: doc,
    "application/msword": doc,
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": doc,
    "application/vnd.ms-excel": doc,
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": doc,
    "application/vnd.oasis.opendocument.text": doc,
    "application/vnd.oasis.opendocument.spreadsheet": doc,
    "text/plain": doc,
    "text/csv": doc,
  })
    .input(documentUploadInput)
    .middleware(({ input }) =>
      guard(async () =>
        authorizeDocumentUpload(prisma, await getServerSession(authOptions), input)
      )
    )
    .onUploadComplete(({ metadata, file }) => saveUploadedDocument(prisma, metadata, file)),

  maintenanceImage: f(image("maintenanceImage", "4MB"))
    .input(maintenanceImageInput)
    .middleware(({ input, files }) =>
      guard(async () =>
        authorizeMaintenanceImageUpload(
          prisma,
          await getServerSession(authOptions),
          input,
          files.length
        )
      )
    )
    .onUploadComplete(({ metadata, file }) => saveMaintenanceImage(prisma, metadata, file)),

  avatar: f(image("avatar", "2MB"))
    .middleware(() => guard(async () => authorizeAvatarUpload(await getServerSession(authOptions))))
    .onUploadComplete(async ({ metadata, file }) => {
      const { url, previousKey } = await saveAvatar(prisma, metadata, file)
      // L'ancienne photo n'est plus référencée : suppression au mieux
      await deleteRemoteFiles([previousKey])
      return { url }
    }),
} satisfies FileRouter

export type OurFileRouter = typeof ourFileRouter
