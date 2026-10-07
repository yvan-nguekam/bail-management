import { getServerSession } from "next-auth"
import { formatCurrency } from "@/lib/utils"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import Link from "next/link"
import { Building2, ChevronRight, FileText, Plus, Users, Wallet } from "lucide-react"
import { StatCard } from "@/components/dashboard/stat-card"
import { QuickActions } from "@/components/dashboard/quick-actions"
import { formatDate, greeting } from "@/components/dashboard/format"
import { PageHeader } from "@/components/shared/page-header"
import { StatusBadge } from "@/components/shared/status-badge"
import { EmptyState } from "@/components/shared/empty-state"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export default async function LandlordDashboard() {
  const session = await getServerSession(authOptions)

  if (!session || !["LANDLORD", "MANAGER", "ADMIN"].includes(session.user.role)) {
    redirect("/dashboard")
  }

  // Fetch statistics
  const [propertiesCount, tenantsCount, activeLeases, pendingPayments] = await Promise.all([
    prisma.property.count({
      where: { ownerId: session.user.id }
    }),
    prisma.lease.count({
      where: {
        property: { ownerId: session.user.id },
        status: "ACTIVE"
      }
    }),
    prisma.lease.findMany({
      where: {
        property: { ownerId: session.user.id },
        status: "ACTIVE"
      },
      take: 5,
      include: {
        property: true,
        tenant: true
      }
    }),
    prisma.payment.count({
      where: {
        lease: {
          property: { ownerId: session.user.id }
        },
        status: "PENDING"
      }
    })
  ])

  // Calculate total expected monthly revenue
  const totalRevenue = await prisma.lease.aggregate({
    where: {
      property: { ownerId: session.user.id },
      status: "ACTIVE"
    },
    _sum: {
      monthlyRent: true
    }
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tableau de bord"
        description={`${greeting(session.user.name)}, voici l'état de votre parc locatif.`}
        actions={
          <Button asChild>
            <Link href="/properties/new">
              <Plus className="h-4 w-4" aria-hidden />
              Ajouter un bien
            </Link>
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          index={0}
          title="Biens"
          value={propertiesCount}
          description="Biens gérés"
          icon={Building2}
          tone="primary"
        />
        <StatCard
          index={1}
          title="Locataires actifs"
          value={tenantsCount}
          description="Baux en cours"
          icon={Users}
          tone="info"
        />
        <StatCard
          index={2}
          title="Paiements en attente"
          value={pendingPayments}
          description={pendingPayments > 0 ? "À encaisser" : "Tout est à jour"}
          icon={Wallet}
          tone={pendingPayments > 0 ? "warning" : "default"}
        />
        <StatCard
          index={3}
          title="Loyers mensuels"
          value={formatCurrency(totalRevenue._sum?.monthlyRent || 0)}
          description="Revenu mensuel attendu"
          icon={FileText}
          tone="success"
        />
      </div>

      {/* Active leases */}
      <Card className="animate-fade-up" style={{ "--stagger": 4 } as React.CSSProperties}>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div className="space-y-1">
            <CardTitle>Baux actifs</CardTitle>
            <CardDescription>Vos contrats de location en cours</CardDescription>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href="/leases">Voir tout</Link>
          </Button>
        </CardHeader>
        <CardContent>
          {activeLeases.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="Aucun bail actif"
              description="Commencez par ajouter un bien, puis créez votre premier bail."
              action={
                <Button asChild>
                  <Link href="/properties/new">
                    <Plus className="h-4 w-4" aria-hidden />
                    Ajouter un bien
                  </Link>
                </Button>
              }
            />
          ) : (
            <ul className="-mx-6 divide-y border-t">
              {activeLeases.map((lease) => (
                <li key={lease.id}>
                  <Link
                    href={`/leases/${lease.id}`}
                    className="flex min-h-11 cursor-pointer items-center gap-4 px-6 py-3 transition-colors hover:bg-muted/50"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{lease.property.name}</p>
                      <p className="truncate text-sm text-muted-foreground">
                        {lease.tenant.name} · {formatDate(lease.startDate)} – {formatDate(lease.endDate)}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <div className="text-right">
                        <p className="font-semibold tabular-nums">
                          {formatCurrency(lease.monthlyRent)}
                          <span className="text-xs font-normal text-muted-foreground"> / mois</span>
                        </p>
                        <StatusBadge kind="lease" status={lease.status} className="mt-1" />
                      </div>
                      <ChevronRight className="hidden h-4 w-4 text-muted-foreground sm:block" aria-hidden />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <QuickActions
        index={5}
        actions={[
          {
            href: "/properties/new",
            icon: Building2,
            title: "Ajouter un bien",
            description: "Nouveau logement ou local",
          },
          {
            href: "/leases/new",
            icon: FileText,
            title: "Créer un bail",
            description: "Associer un locataire à un bien",
          },
          {
            href: "/payments",
            icon: Wallet,
            title: "Enregistrer un paiement",
            description: "Loyer reçu ou en retard",
          },
        ]}
      />
    </div>
  )
}
