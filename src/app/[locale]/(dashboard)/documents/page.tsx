"use client"

import { useCallback, useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { Button, buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { PageHeader } from "@/components/shared/page-header"
import { EmptyState } from "@/components/shared/empty-state"
import { TableSkeleton } from "@/components/shared/page-skeleton"
import {
  AddDocumentDialog,
  type LeaseOption,
  type PropertyOption,
} from "@/components/documents/add-document-dialog"
import {
  DOCUMENT_TYPES,
  documentIconKind,
  documentTypeLabel,
  documentTypeLabels,
  formatFileSize,
  type DocumentIconKind,
} from "@/lib/documents"
import {
  ExternalLink,
  File,
  FileArchive,
  FileImage,
  FileSpreadsheet,
  FileText,
  FolderOpen,
  Loader2,
  Plus,
  Trash2,
  type LucideIcon,
} from "lucide-react"
import { toast } from "sonner"

interface DocumentItem {
  id: string
  name: string
  type: string
  url: string
  size: number
  mimeType: string
  propertyId: string | null
  leaseId: string | null
  createdAt: string
  property: { id: string; name: string } | null
  lease: {
    id: string
    property: { id: string; name: string }
    tenant: { id: string; name: string }
  } | null
  uploadedBy: { id: string; name: string }
}

/** Bien rattaché directement, ou via le bail. */
function attachedProperty(doc: DocumentItem) {
  return doc.property ?? doc.lease?.property ?? null
}

const ICONS: Record<DocumentIconKind, LucideIcon> = {
  pdf: FileText,
  image: FileImage,
  sheet: FileSpreadsheet,
  text: FileText,
  archive: FileArchive,
  file: File,
}

export default function DocumentsPage() {
  const { data: session } = useSession()
  const [documents, setDocuments] = useState<DocumentItem[]>([])
  const [properties, setProperties] = useState<PropertyOption[]>([])
  const [leases, setLeases] = useState<LeaseOption[]>([])
  const [loading, setLoading] = useState(true)
  const [typeFilter, setTypeFilter] = useState("all")
  const [propertyFilter, setPropertyFilter] = useState("all")
  const [addOpen, setAddOpen] = useState(false)
  const [toDelete, setToDelete] = useState<DocumentItem | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const loadDocuments = useCallback(async () => {
    const response = await fetch("/api/documents")
    if (!response.ok) throw new Error("Erreur lors du chargement des documents")
    const data = await response.json()
    setDocuments(data.documents)
  }, [])

  useEffect(() => {
    const load = async () => {
      try {
        const [, propertiesRes, leasesRes] = await Promise.all([
          loadDocuments(),
          fetch("/api/properties?limit=100"),
          fetch("/api/leases?limit=100"),
        ])
        if (propertiesRes.ok) {
          const data = await propertiesRes.json()
          setProperties(data.properties.map((p: PropertyOption) => ({ id: p.id, name: p.name })))
        }
        if (leasesRes.ok) {
          const data = await leasesRes.json()
          setLeases(data.leases)
        }
      } catch (error) {
        console.error("Erreur:", error)
        toast.error("Erreur lors du chargement des documents")
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [loadDocuments])

  const handleDelete = async () => {
    if (!toDelete) return
    setIsDeleting(true)
    try {
      const response = await fetch(`/api/documents/${toDelete.id}`, { method: "DELETE" })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Erreur lors de la suppression")
      }
      setDocuments((prev) => prev.filter((d) => d.id !== toDelete.id))
      toast.success("Document supprimé")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur lors de la suppression")
    } finally {
      setIsDeleting(false)
      setToDelete(null)
    }
  }

  const isTenant = session?.user?.role === "TENANT"
  const filtered = documents.filter(
    (d) =>
      (typeFilter === "all" || d.type === typeFilter) &&
      (propertyFilter === "all" || attachedProperty(d)?.id === propertyFilter)
  )
  const hasFilters = typeFilter !== "all" || propertyFilter !== "all"
  const propertyOptions = properties.length
    ? properties
    : // Un locataire voit ses biens via les documents eux-mêmes
      Array.from(
        new Map(
          documents.flatMap((d) => {
            const p = attachedProperty(d)
            return p ? [[p.id, p] as const] : []
          })
        ).values()
      )

  return (
    <div className="space-y-6">
      <PageHeader
        title="Documents"
        description="Contrats, quittances et pièces rattachés à vos biens et à vos baux"
        actions={
          <Button onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4" aria-hidden />
            Ajouter par lien
          </Button>
        }
      />

      <Card className="animate-fade-up" style={{ "--stagger": 1 } as React.CSSProperties}>
        <CardHeader className="gap-4 border-b sm:flex sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              <FolderOpen className="h-4 w-4 text-muted-foreground" aria-hidden />
              Bibliothèque
            </CardTitle>
            <p className="text-sm text-muted-foreground tabular-nums">
              {filtered.length} document{filtered.length > 1 ? "s" : ""}
            </p>
          </div>
          <div className="grid gap-2 sm:flex sm:items-center">
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full sm:w-[170px]" aria-label="Filtrer par type">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les types</SelectItem>
                {DOCUMENT_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {documentTypeLabels[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={propertyFilter} onValueChange={setPropertyFilter}>
              <SelectTrigger className="w-full sm:w-[200px]" aria-label="Filtrer par bien">
                <SelectValue placeholder="Bien" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les biens</SelectItem>
                {propertyOptions.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {loading ? (
            <TableSkeleton rows={6} />
          ) : filtered.length === 0 ? (
            <EmptyState
              size="sm"
              icon={FolderOpen}
              title="Aucun document"
              description={
                hasFilters
                  ? "Aucun document ne correspond à ces filtres."
                  : isTenant
                    ? "Les documents liés à votre bail apparaîtront ici."
                    : "Ajoutez un premier document par lien pour constituer votre bibliothèque."
              }
              action={
                hasFilters ? (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setTypeFilter("all")
                      setPropertyFilter("all")
                    }}
                  >
                    Réinitialiser les filtres
                  </Button>
                ) : (
                  <Button onClick={() => setAddOpen(true)}>
                    <Plus className="h-4 w-4" aria-hidden />
                    Ajouter par lien
                  </Button>
                )
              }
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Document</TableHead>
                  <TableHead className="hidden sm:table-cell">Type</TableHead>
                  <TableHead className="hidden md:table-cell">Rattaché à</TableHead>
                  <TableHead className="hidden lg:table-cell">Ajouté par</TableHead>
                  <TableHead className="hidden sm:table-cell text-right">Taille</TableHead>
                  <TableHead className="hidden md:table-cell text-right">Date</TableHead>
                  <TableHead className="text-right">
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((doc) => {
                  const Icon = ICONS[documentIconKind(doc.mimeType)]
                  return (
                    <TableRow key={doc.id}>
                      <TableCell className="max-w-[260px] py-3">
                        <div className="flex items-center gap-3">
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                            <Icon className="h-4 w-4 text-muted-foreground" aria-hidden />
                          </span>
                          <div className="min-w-0">
                            <a
                              href={doc.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block truncate font-medium hover:text-primary"
                            >
                              {doc.name}
                            </a>
                            <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground sm:hidden">
                              <span>{documentTypeLabel(doc.type)}</span>
                              <span>{formatFileSize(doc.size)}</span>
                              <span>{new Date(doc.createdAt).toLocaleDateString("fr-FR")}</span>
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell py-3">
                        <Badge variant="muted">{documentTypeLabel(doc.type)}</Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell py-3">
                        {attachedProperty(doc) ? (
                          <span className="font-medium">{attachedProperty(doc)?.name}</span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                        {doc.lease && (
                          <span className="block text-xs text-muted-foreground">
                            Bail · {doc.lease.tenant.name}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell py-3">{doc.uploadedBy.name}</TableCell>
                      <TableCell className="hidden sm:table-cell py-3 text-right text-muted-foreground tabular-nums">
                        {formatFileSize(doc.size)}
                      </TableCell>
                      <TableCell className="hidden md:table-cell py-3 text-right text-muted-foreground tabular-nums">
                        {new Date(doc.createdAt).toLocaleDateString("fr-FR")}
                      </TableCell>
                      <TableCell className="py-3 text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" asChild>
                            <a
                              href={doc.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              aria-label={`Ouvrir ${doc.name} dans un nouvel onglet`}
                            >
                              <ExternalLink className="h-4 w-4" aria-hidden />
                            </a>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            onClick={() => setToDelete(doc)}
                            aria-label={`Supprimer ${doc.name}`}
                          >
                            <Trash2 className="h-4 w-4" aria-hidden />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AddDocumentDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        properties={properties}
        leases={leases}
        onCreated={() => loadDocuments().catch(() => toast.error("Erreur lors du rechargement"))}
      />

      <AlertDialog open={toDelete !== null} onOpenChange={(open) => !open && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce document ?</AlertDialogTitle>
            <AlertDialogDescription>
              « {toDelete?.name} » sera retiré de la bibliothèque. Le fichier hébergé à l&apos;adresse
              d&apos;origine n&apos;est pas touché.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                handleDelete()
              }}
              disabled={isDeleting}
              className={buttonVariants({ variant: "destructive" })}
            >
              {isDeleting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
