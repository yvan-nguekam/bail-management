import { getServerSession } from "next-auth"
import { formatCurrency } from "@/lib/utils"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Building2, CheckCircle2, Clock, Percent, TrendingUp, Wallet } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PageHeader } from "@/components/shared/page-header"
import { statusLabel } from "@/components/shared/status-badge"
import { StatCard } from "@/components/dashboard/stat-card"
import { RevenueChart, type RevenuePoint } from "@/components/dashboard/revenue-chart"
import { OccupancyChart, type OccupancyPoint } from "@/components/dashboard/occupancy-chart"
import { PaymentStatusChart } from "@/components/dashboard/payment-status-chart"
import { ExportButton } from "@/components/dashboard/export-button"
import { formatMonth } from "@/components/dashboard/format"

type StatTone = "default" | "primary" | "success" | "warning" | "danger" | "info"

const paymentTone: Record<string, StatTone> = {
  PAID: "success",
  PENDING: "warning",
  OVERDUE: "danger",
  CANCELLED: "default",
}

export default async function ReportsPage() {
  const session = await getServerSession(authOptions)

  if (!session || !["LANDLORD", "MANAGER", "ADMIN"].includes(session.user.role)) {
    redirect("/dashboard")
  }

  // Fetch data for charts
  const now = new Date()
  const lastYear = new Date(now.getFullYear() - 1, now.getMonth(), 1)

  // Revenue data by month
  const payments = await prisma.payment.findMany({
    where: {
      lease: {
        property: { ownerId: session.user.id }
      },
      dueDate: {
        gte: lastYear
      }
    },
    select: {
      amount: true,
      status: true,
      dueDate: true,
      paidDate: true
    },
    orderBy: {
      dueDate: "asc"
    }
  })

  // Properties occupancy over time
  const properties = await prisma.property.findMany({
    where: {
      ownerId: session.user.id
    },
    select: {
      id: true,
      status: true,
      createdAt: true
    }
  })

  const activeLeases = await prisma.lease.findMany({
    where: {
      property: { ownerId: session.user.id },
      status: "ACTIVE"
    },
    select: {
      startDate: true,
      endDate: true
    }
  })

  // Payment status distribution
  const paymentStats = await prisma.payment.groupBy({
    by: ["status"],
    where: {
      lease: {
        property: { ownerId: session.user.id }
      }
    },
    _count: {
      status: true
    },
    _sum: {
      amount: true
    }
  })

  // Calculate monthly revenue
  const revenueByMonth = payments.reduce<RevenuePoint[]>((acc, payment) => {
    const month = formatMonth(payment.dueDate)

    const existing = acc.find(item => item.month === month)
    if (existing) {
      existing.total += payment.amount
      if (payment.status === "PAID") {
        existing.paid += payment.amount
      } else if (payment.status === "PENDING") {
        existing.pending += payment.amount
      } else if (payment.status === "OVERDUE") {
        existing.overdue += payment.amount
      }
    } else {
      acc.push({
        month,
        total: payment.amount,
        paid: payment.status === "PAID" ? payment.amount : 0,
        pending: payment.status === "PENDING" ? payment.amount : 0,
        overdue: payment.status === "OVERDUE" ? payment.amount : 0
      })
    }
    return acc
  }, [])

  // Calculate occupancy rate by month
  const occupancyByMonth: OccupancyPoint[] = []
  for (let i = 11; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const month = formatMonth(date)

    const totalProperties = properties.filter(p =>
      new Date(p.createdAt) <= date
    ).length

    const occupiedProperties = activeLeases.filter(lease => {
      const start = new Date(lease.startDate)
      const end = new Date(lease.endDate)
      return start <= date && end >= date
    }).length

    const rate = totalProperties > 0 ? (occupiedProperties / totalProperties) * 100 : 0

    occupancyByMonth.push({
      month,
      rate: Math.round(rate),
      occupied: occupiedProperties,
      total: totalProperties
    })
  }

  const totalRevenue = revenueByMonth.reduce((sum, item) => sum + item.total, 0)
  const collected = revenueByMonth.reduce((sum, item) => sum + item.paid, 0)
  const outstanding = revenueByMonth.reduce((sum, item) => sum + item.pending + item.overdue, 0)
  const currentOccupancy = occupancyByMonth[occupancyByMonth.length - 1]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Rapports"
        description="Revenus, occupation et paiements sur les 12 derniers mois."
        actions={<ExportButton type="revenue" data={revenueByMonth} />}
      />

      <Tabs defaultValue="revenue" className="space-y-4">
        <TabsList className="animate-fade-up">
          <TabsTrigger value="revenue">Revenus</TabsTrigger>
          <TabsTrigger value="occupancy">Occupation</TabsTrigger>
          <TabsTrigger value="payments">Paiements</TabsTrigger>
        </TabsList>

        <TabsContent value="revenue" className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard
              index={0}
              title="Revenus facturés"
              value={formatCurrency(totalRevenue)}
              description="12 derniers mois"
              icon={TrendingUp}
              tone="primary"
            />
            <StatCard
              index={1}
              title="Encaissé"
              value={formatCurrency(collected)}
              description="Loyers payés"
              icon={CheckCircle2}
              tone="success"
            />
            <StatCard
              index={2}
              title="Restant dû"
              value={formatCurrency(outstanding)}
              description="En attente ou en retard"
              icon={Clock}
              tone={outstanding > 0 ? "warning" : "default"}
            />
          </div>
          <Card className="animate-fade-up" style={{ "--stagger": 3 } as React.CSSProperties}>
            <CardHeader>
              <CardTitle>Évolution des revenus</CardTitle>
              <CardDescription>
                Loyers encaissés, en attente et en retard, mois par mois
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RevenueChart data={revenueByMonth} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="occupancy" className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard
              index={0}
              title="Taux d'occupation"
              value={`${currentOccupancy?.rate || 0} %`}
              description="Ce mois-ci"
              icon={Percent}
              tone="primary"
            />
            <StatCard
              index={1}
              title="Biens occupés"
              value={currentOccupancy?.occupied || 0}
              description="Avec un bail actif"
              icon={Building2}
              tone="info"
            />
            <StatCard
              index={2}
              title="Biens au total"
              value={properties.length}
              description="Dans votre portefeuille"
              icon={Building2}
            />
          </div>
          <Card className="animate-fade-up" style={{ "--stagger": 3 } as React.CSSProperties}>
            <CardHeader>
              <CardTitle>Taux d&apos;occupation</CardTitle>
              <CardDescription>
                Part des biens loués sur les 12 derniers mois
              </CardDescription>
            </CardHeader>
            <CardContent>
              <OccupancyChart data={occupancyByMonth} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments" className="space-y-4">
          {paymentStats.length > 0 && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {paymentStats.map((stat, i) => (
                <StatCard
                  key={stat.status}
                  index={i}
                  title={statusLabel("payment", stat.status)}
                  value={formatCurrency(stat._sum.amount || 0)}
                  description={`${stat._count.status} paiement${stat._count.status > 1 ? "s" : ""}`}
                  icon={Wallet}
                  tone={paymentTone[stat.status] ?? "default"}
                />
              ))}
            </div>
          )}
          <Card className="animate-fade-up" style={{ "--stagger": paymentStats.length } as React.CSSProperties}>
            <CardHeader>
              <CardTitle>Répartition des paiements</CardTitle>
              <CardDescription>
                Montants par statut, sur l&apos;ensemble de vos baux
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PaymentStatusChart data={paymentStats} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
