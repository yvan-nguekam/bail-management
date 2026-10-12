import { NextRequest, NextResponse } from "next/server"
import { createRouteHandler } from "uploadthing/next"
import { isUploadConfigured } from "@/lib/remote-files"
import { ourFileRouter } from "./core"

// Sans UPLOADTHING_TOKEN, l'envoi de fichiers est désactivé : 503 explicite plutôt
// qu'une erreur interne d'Uploadthing. L'ajout de documents par lien reste disponible.
let handlers: ReturnType<typeof createRouteHandler> | null = null

function getHandlers() {
  handlers ??= createRouteHandler({
    router: ourFileRouter,
    config: { token: process.env.UPLOADTHING_TOKEN },
  })
  return handlers
}

function notConfigured() {
  return NextResponse.json(
    { error: "Upload non configuré", message: "Upload non configuré" },
    { status: 503 }
  )
}

export async function GET(request: NextRequest) {
  if (!isUploadConfigured()) return notConfigured()
  return getHandlers().GET(request)
}

export async function POST(request: NextRequest) {
  if (!isUploadConfigured()) return notConfigured()
  return getHandlers().POST(request)
}
