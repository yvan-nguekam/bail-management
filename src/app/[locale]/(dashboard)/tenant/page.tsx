import { getServerSession } from "next-auth"
import { formatCurrency } from "@/lib/utils"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import Link from "next/link"
import { FileText, Home, MessageSquare, Plus, Wallet, Wrench } from "lucide-react"
import { StatCard } from "@/components/dashboard/stat-card"
import { QuickActions } from "@/components/dashboard/quick-actions"
import { formatDate, greeting } from "@/components/dashboard/format"
import { PageHeader } from "@/components/shared/page-header"
import { StatusBadge } from "@/components/shared/status-badge"
import { EmptyState } from "@/components/shared/empty-state"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export default async function TenantDashboard() {
  const session = await getServerSession(authOptions)

  if (!session || session.user.role !== "TENANT") {
    redirect("/dashboard")
  }

  // Fetch tenant data
  const [activeLease, payments, maintenanceRequests] = await Promise.all([
    prisma.lease.findFirst({
      where: {
        tenantId: session.user.id,
        status: "ACTIVE"
      },
      include: {
        property: {
          include: {
            owner: true
          }
        }
      }
    }),
    prisma.payment.findMany({
      where: {
        tenantId: session.user.id
      },
      orderBy: {
        dueDate: "desc"
      },
      take: 5
    }),
    prisma.maintenanceRequest.count({
      where: {
        tenantId: session.user.id,
        status: { in: ["OPEN", "IN_PROGRESS"] }
      }
    })
  ])

  const paidPayments = await prisma.payment.count({
    where: {
      tenantId: session.user.id,
      status: "PAID"
    }
  })

  const pendingPayments = await prisma.payment.count({
    where: {
      tenantId: session.user.id,
      status: "PENDING"
    }
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tableau de bord"
        description={`${greeting(session.user.name)}, voici un résumé de votre location.`}
        actions={
          <Button asChild>
            <Link href="/maintenance/new">
              <Plus className="h-4 w-4" aria-hidden />
              Nouvelle demande
            </Link>
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          index={0}
          title="Bail actif"
          value={activeLease ? "Oui" : "Non"}
          description={activeLease ? activeLease.property.name : "Aucun bail en cours"}
          icon={Home}
          tone={activeLease ? "success" : "default"}
        />
        <StatCard
          index={1}
          title="Paiements effectués"
          value={paidPayments}
          description="Loyers réglés"
          icon={Wallet}
          tone="success"
        />
        <StatCard
          index={2}
          title="Paiements en attente"
          value={pendingPayments}
          description={pendingPayments > 0 ? "À régler" : "Vous êtes à jour"}
          icon={FileText}
          tone={pendingPayments > 0 ? "warning" : "default"}
        />
        <StatCard
          index={3}
          title="Demandes ouvertes"
          value={maintenanceRequests}
          description="Interventions en cours"
          icon={Wrench}
          tone={maintenanceRequests > 0 ? "info" : "default"}
        />
      </div>

      {/* Current lease */}
      {activeLease ? (
        <Card className="animate-fade-up" style={{ "--stagger": 4 } as React.CSSProperties}>
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div className="space-y-1">
              <CardTitle>Mon bail</CardTitle>
              <CardDescription>Votre contrat de location en cours</CardDescription>
            </div>
            <StatusBadge kind="lease" status={activeLease.status} />
          </CardHeader>
          <CardContent className="space-y-6">
            <dl className="grid gap-6 sm:grid-cols-2">
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Logement</dt>
                <dd className="mt-1 text-base font-semibold">{activeLease.property.name}</dd>
                <dd className="text-sm text-muted-foreground">{activeLease.property.address}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Propriétaire</dt>
                <dd className="mt-1 text-base font-semibold">{activeLease.property.owner.name}</dd>
                <dd className="truncate text-sm text-muted-foreground">
                  {activeLease.property.owner.email}
                </dd>
              </div>
            </dl>
            <dl className="grid gap-6 border-t pt-6 sm:grid-cols-2">
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Loyer mensuel</dt>
                <dd className="mt-1 text-2xl font-semibold tabular-nums tracking-tight">
                  {formatCurrency(activeLease.monthlyRent)}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Période</dt>
                <dd className="mt-1 text-base">
                  Du {formatDate(activeLease.startDate)} au {formatDate(activeLease.endDate)}
                </dd>
              </div>
            </dl>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button variant="outline" asChild>
                <Link href={`/leases/${activeLease.id}`}>
                  <FileText className="h-4 w-4" aria-hidden />
                  Voir le bail
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href={`/messages/new?to=${activeLease.property.ownerId}`}>
                  <MessageSquare className="h-4 w-4" aria-hidden />
                  Contacter le propriétaire
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <EmptyState
          icon={Home}
          title="Aucun bail actif"
          description="Vous n'avez pas de contrat de location en cours pour le moment."
          className="animate-fade-up bg-card"
        />
      )}

      {/* Recent payments */}
      <Card className="animate-fade-up" style={{ "--stagger": 5 } as React.CSSProperties}>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div className="space-y-1">
            <CardTitle>Derniers paiements</CardTitle>
            <CardDescription>Vos cinq dernières échéances</CardDescription>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href="/payments">Voir tout</Link>
          </Button>
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <EmptyState
              icon={Wallet}
              title="Aucun paiement"
              description="Vos loyers apparaîtront ici dès la première échéance."
              className="py-10"
            />
          ) : (
            <ul className="-mx-6 divide-y border-t">
              {payments.map((payment) => (
                <li
                  key={payment.id}
                  className="flex min-h-11 items-center justify-between gap-4 px-6 py-3"
                >
                  <div className="min-w-0">
                    <p className="font-semibold tabular-nums">{formatCurrency(payment.amount)}</p>
                    <p className="truncate text-sm text-muted-foreground">
                      Échéance le {formatDate(payment.dueDate)}
                      {payment.paidDate && ` · payé le ${formatDate(payment.paidDate)}`}
                    </p>
                  </div>
                  <StatusBadge kind="payment" status={payment.status} />
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <QuickActions
        index={6}
        actions={[
          {
            href: "/payments",
            icon: Wallet,
            title: "Payer mon loyer",
            description: "Voir mes échéances",
          },
          {
            href: "/maintenance/new",
            icon: Wrench,
            title: "Demander une intervention",
            description: "Signaler un problème",
          },
          {
            href: "/documents",
            icon: FileText,
            title: "Mes documents",
            description: "Bail, quittances, état des lieux",
          },
        ]}
      />
    </div>
  )
}
