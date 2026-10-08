import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { formatCurrency } from "@/lib/utils"
import { toUtcDay } from "@/lib/payment-schedule"
import { userRoleLabels } from "@/lib/users"
import { greeting } from "@/components/dashboard/format"
import { StatCard } from "@/components/dashboard/stat-card"
import { PageHeader } from "@/components/shared/page-header"
import { AdminUsersTable } from "@/components/admin/users-table"
import { AlertTriangle, Building2, FileText, Users } from "lucide-react"

export default async function AdminDashboard() {
  const session = await getServerSession(authOptions)

  if (!session || session.user.role !== "ADMIN") {
    redirect("/dashboard")
  }

  const today = toUtcDay(new Date())

  const [usersByRole, propertiesCount, activeLeases, overdue] = await Promise.all([
    prisma.user.groupBy({ by: ["role"], _count: { _all: true } }),
    prisma.property.count(),
    prisma.lease.count({ where: { status: "ACTIVE" } }),
    prisma.payment.aggregate({
      where: {
        OR: [{ status: "OVERDUE" }, { status: "PENDING", dueDate: { lt: today } }],
      },
      _sum: { amount: true },
      _count: { _all: true },
    }),
  ])

  const roleCounts = Object.fromEntries(usersByRole.map((r) => [r.role, r._count._all])) as Record<
    string,
    number
  >
  const totalUsers = usersByRole.reduce((sum, r) => sum + r._count._all, 0)
  const roleSummary = (["LANDLORD", "MANAGER", "TENANT", "ADMIN"] as const)
    .filter((role) => roleCounts[role])
    .map((role) => `${roleCounts[role]} ${userRoleLabels[role].toLowerCase()}${roleCounts[role] > 1 ? "s" : ""}`)
    .join(" · ")

  const overdueTotal = overdue._sum.amount ?? 0
  const overdueCount = overdue._count._all

  return (
    <div className="space-y-6">
      <PageHeader
        title="Administration"
        description={`${greeting(session.user.name)}, voici l'état global de la plateforme.`}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          index={0}
          title="Utilisateurs"
          value={totalUsers}
          description="Comptes enregistrés"
          icon={Users}
          tone="primary"
        />
        <StatCard
          index={1}
          title="Biens"
          value={propertiesCount}
          description="Sur toute la plateforme"
          icon={Building2}
          tone="info"
        />
        <StatCard
          index={2}
          title="Baux actifs"
          value={activeLeases}
          description="Contrats en cours"
          icon={FileText}
          tone="success"
        />
        <StatCard
          index={3}
          title="Impayés"
          value={formatCurrency(overdueTotal)}
          description={
            overdueCount > 0
              ? `${overdueCount} paiement${overdueCount > 1 ? "s" : ""} en retard`
              : "Aucun retard"
          }
          icon={AlertTriangle}
          tone={overdueCount > 0 ? "danger" : "default"}
          valueClassName={overdueCount > 0 ? "text-destructive" : undefined}
        />
      </div>

      <AdminUsersTable roleSummary={roleSummary} />
    </div>
  )
}
