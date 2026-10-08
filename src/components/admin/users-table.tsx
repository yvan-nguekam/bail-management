"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
import { Input } from "@/components/ui/input"
import { EmptyState } from "@/components/shared/empty-state"
import { TableSkeleton } from "@/components/shared/page-skeleton"
import { USER_ROLES, canChangeRole, userRoleLabel, userRoleLabels } from "@/lib/users"
import { Users } from "lucide-react"
import { toast } from "sonner"

interface UserRow {
  id: string
  name: string
  email: string
  phone: string | null
  role: string
  createdAt: string
}

const roleVariant: Record<string, "info" | "success" | "warning" | "muted"> = {
  ADMIN: "warning",
  LANDLORD: "info",
  MANAGER: "success",
  TENANT: "muted",
}

interface AdminUsersTableProps {
  /** Répartition par rôle calculée côté serveur, ex. "1 propriétaire · 2 locataires" */
  roleSummary?: string
}

export function AdminUsersTable({ roleSummary }: AdminUsersTableProps) {
  const { data: session } = useSession()
  const [users, setUsers] = useState<UserRow[]>([])
  const [loading, setLoading] = useState(true)
  const [roleFilter, setRoleFilter] = useState("all")
  const [search, setSearch] = useState("")
  const [busyId, setBusyId] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      try {
        const response = await fetch("/api/users")
        if (!response.ok) throw new Error("Erreur lors du chargement des utilisateurs")
        setUsers(await response.json())
      } catch (error) {
        console.error("Erreur:", error)
        toast.error("Erreur lors du chargement des utilisateurs")
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const changeRole = async (user: UserRow, role: string) => {
    if (role === user.role) return
    setBusyId(user.id)
    try {
      const response = await fetch(`/api/users/${user.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Erreur lors de la modification du rôle")
      }
      const updated: UserRow = await response.json()
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? { ...u, role: updated.role } : u)))
      toast.success(`${updated.name} est maintenant ${userRoleLabel(updated.role).toLowerCase()}`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur lors de la modification du rôle")
    } finally {
      setBusyId(null)
    }
  }

  const term = search.trim().toLowerCase()
  const filtered = users.filter(
    (u) =>
      (roleFilter === "all" || u.role === roleFilter) &&
      (!term || u.name.toLowerCase().includes(term) || u.email.toLowerCase().includes(term))
  )
  const hasFilters = roleFilter !== "all" || term.length > 0

  return (
    <Card className="animate-fade-up" style={{ "--stagger": 5 } as React.CSSProperties}>
      <CardHeader className="gap-4 border-b sm:flex sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" aria-hidden />
            Utilisateurs
          </CardTitle>
          <CardDescription className="tabular-nums">
            {filtered.length} compte{filtered.length > 1 ? "s" : ""}
            {!hasFilters && roleSummary ? ` · ${roleSummary}` : ""}
          </CardDescription>
        </div>
        <div className="grid gap-2 sm:flex sm:items-center">
          <Input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un nom ou un e-mail"
            aria-label="Rechercher un utilisateur"
            className="w-full sm:w-[240px]"
          />
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-full sm:w-[170px]" aria-label="Filtrer par rôle">
              <SelectValue placeholder="Rôle" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les rôles</SelectItem>
              {USER_ROLES.map((r) => (
                <SelectItem key={r} value={r}>
                  {userRoleLabels[r]}
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
            icon={Users}
            title="Aucun utilisateur"
            description={hasFilters ? "Aucun compte ne correspond à ces critères." : "Aucun compte enregistré."}
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Utilisateur</TableHead>
                <TableHead className="hidden md:table-cell">E-mail</TableHead>
                <TableHead>Rôle</TableHead>
                <TableHead className="hidden sm:table-cell text-right">Inscrit le</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((user) => {
                const editable = session?.user ? canChangeRole(session.user, user.id) : false
                return (
                  <TableRow key={user.id}>
                    <TableCell className="py-3">
                      <div className="font-medium">
                        {user.name}
                        {session?.user?.id === user.id && (
                          <span className="ml-2 text-xs font-normal text-muted-foreground">(vous)</span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground md:hidden">{user.email}</div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell py-3 text-muted-foreground">
                      {user.email}
                    </TableCell>
                    <TableCell className="py-3">
                      {editable ? (
                        <Select
                          value={user.role}
                          onValueChange={(role) => changeRole(user, role)}
                          disabled={busyId === user.id}
                        >
                          <SelectTrigger
                            size="sm"
                            className="w-[150px]"
                            aria-label={`Rôle de ${user.name}`}
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {USER_ROLES.map((r) => (
                              <SelectItem key={r} value={r}>
                                {userRoleLabels[r]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge variant={roleVariant[user.role] ?? "muted"}>{userRoleLabel(user.role)}</Badge>
                      )}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell py-3 text-right text-muted-foreground tabular-nums">
                      {new Date(user.createdAt).toLocaleDateString("fr-FR")}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
