import { getServerSession } from "next-auth"
import { formatCurrency } from "@/lib/utils"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { RevenueChart } from "@/components/dashboard/revenue-chart"
import { OccupancyChart } from "@/components/dashboard/occupancy-chart"
import { PaymentStatusChart } from "@/components/dashboard/payment-status-chart"
import { ExportButton } from "@/components/dashboard/export-button"
import { Download, FileText } from "lucide-react"

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
  const revenueByMonth = payments.reduce((acc: any[], payment) => {
    const month = new Date(payment.dueDate).toLocaleString("en-US", {
      month: "short",
      year: "numeric"
    })

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
  const occupancyByMonth = []
  for (let i = 11; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const month = date.toLocaleString("en-US", { month: "short", year: "numeric" })

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reports & Analytics</h1>
          <p className="text-muted-foreground">
            Detailed financial and occupancy insights
          </p>
        </div>
        <div className="flex gap-2">
          <ExportButton type="revenue" data={revenueByMonth} />
        </div>
      </div>

      <Tabs defaultValue="revenue" className="space-y-4">
        <TabsList>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="occupancy">Occupancy</TabsTrigger>
          <TabsTrigger value="payments">Payment Status</TabsTrigger>
        </TabsList>

        <TabsContent value="revenue" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Revenue Overview</CardTitle>
              <CardDescription>
                Monthly revenue trends for the last 12 months
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RevenueChart data={revenueByMonth} />
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Total Revenue (12 months)</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(revenueByMonth.reduce((sum, item) => sum + item.total, 0))}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Collected</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(revenueByMonth.reduce((sum, item) => sum + item.paid, 0))}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Outstanding</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">
                  {formatCurrency(revenueByMonth.reduce((sum, item) => sum + item.pending + item.overdue, 0))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="occupancy" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Occupancy Rate</CardTitle>
              <CardDescription>
                Property occupancy trends over the last 12 months
              </CardDescription>
            </CardHeader>
            <CardContent>
              <OccupancyChart data={occupancyByMonth} />
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Current Occupancy Rate</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {occupancyByMonth[occupancyByMonth.length - 1]?.rate || 0}%
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Occupied Properties</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {occupancyByMonth[occupancyByMonth.length - 1]?.occupied || 0}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Total Properties</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {properties.length}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="payments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Payment Status Distribution</CardTitle>
              <CardDescription>
                Overview of all payment statuses
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PaymentStatusChart data={paymentStats} />
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-3">
            {paymentStats.map((stat) => (
              <Card key={stat.status}>
                <CardHeader className="pb-2">
                  <CardDescription>{stat.status}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatCurrency((stat._sum.amount || 0))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {stat._count.status} payments
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
