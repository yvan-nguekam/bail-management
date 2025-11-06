import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { StatCard } from "@/components/dashboard/stat-card"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Home, FileText, DollarSign, Wrench, Plus } from "lucide-react"
import Link from "next/link"

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back, {session.user.name}
          </p>
        </div>
        <Link href="/maintenance/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Request
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Active Lease"
          value={activeLease ? "Yes" : "No"}
          description={activeLease ? activeLease.property.name : "No active lease"}
          icon={Home}
        />
        <StatCard
          title="Paid Payments"
          value={paidPayments}
          description="Total payments made"
          icon={DollarSign}
        />
        <StatCard
          title="Pending Payments"
          value={pendingPayments}
          description="Awaiting payment"
          icon={FileText}
        />
        <StatCard
          title="Open Requests"
          value={maintenanceRequests}
          description="Maintenance requests"
          icon={Wrench}
        />
      </div>

      {/* Current Lease */}
      {activeLease && (
        <Card>
          <CardHeader>
            <CardTitle>Current Lease</CardTitle>
            <CardDescription>Your active rental agreement</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Property</p>
                  <p className="text-lg font-semibold">{activeLease.property.name}</p>
                  <p className="text-sm text-muted-foreground">{activeLease.property.address}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Landlord</p>
                  <p className="text-lg font-semibold">{activeLease.property.owner.name}</p>
                  <p className="text-sm text-muted-foreground">{activeLease.property.owner.email}</p>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-3 border-t pt-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Monthly Rent</p>
                  <p className="text-2xl font-bold">${activeLease.rentAmount.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Lease Period</p>
                  <p className="text-sm">
                    {new Date(activeLease.startDate).toLocaleDateString()} -{" "}
                    {new Date(activeLease.endDate).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Status</p>
                  <Badge variant="secondary">{activeLease.status}</Badge>
                </div>
              </div>
              <div className="flex gap-4 pt-4">
                <Link href={`/leases/${activeLease.id}`}>
                  <Button variant="outline">View Details</Button>
                </Link>
                <Link href={`/messages/new?to=${activeLease.property.ownerId}`}>
                  <Button variant="outline">Contact Landlord</Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {!activeLease && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Home className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Active Lease</h3>
            <p className="text-sm text-muted-foreground">
              You don&apos;t have an active lease at the moment
            </p>
          </CardContent>
        </Card>
      )}

      {/* Recent Payments */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Recent Payments</CardTitle>
              <CardDescription>Your payment history</CardDescription>
            </div>
            <Link href="/payments">
              <Button variant="outline" size="sm">View All</Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <DollarSign className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-sm text-muted-foreground">No payments yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {payments.map((payment) => (
                <div
                  key={payment.id}
                  className="flex items-center justify-between border-b last:border-0 pb-4 last:pb-0"
                >
                  <div className="space-y-1">
                    <p className="font-medium">${payment.amount.toLocaleString()}</p>
                    <p className="text-sm text-muted-foreground">
                      Due: {new Date(payment.dueDate).toLocaleDateString()}
                    </p>
                    {payment.paidDate && (
                      <p className="text-sm text-muted-foreground">
                        Paid: {new Date(payment.paidDate).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  <Badge variant={payment.status === "PAID" ? "default" : "secondary"}>
                    {payment.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common tasks and shortcuts</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <Link href="/payments">
              <Button variant="outline" className="w-full justify-start h-auto py-4">
                <DollarSign className="mr-2 h-4 w-4" />
                Make Payment
              </Button>
            </Link>
            <Link href="/maintenance/new">
              <Button variant="outline" className="w-full justify-start h-auto py-4">
                <Wrench className="mr-2 h-4 w-4" />
                Request Maintenance
              </Button>
            </Link>
            <Link href="/documents">
              <Button variant="outline" className="w-full justify-start h-auto py-4">
                <FileText className="mr-2 h-4 w-4" />
                View Documents
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
