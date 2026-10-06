import { getServerSession } from "next-auth"
import { formatCurrency } from "@/lib/utils"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { StatCard } from "@/components/dashboard/stat-card"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Building2, Users, FileText, DollarSign, Plus } from "lucide-react"
import Link from "next/link"

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back, {session.user.name}
          </p>
        </div>
        <Link href="/properties/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Property
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Properties"
          value={propertiesCount}
          description="Total properties managed"
          icon={Building2}
        />
        <StatCard
          title="Active Tenants"
          value={tenantsCount}
          description="Currently leasing"
          icon={Users}
        />
        <StatCard
          title="Pending Payments"
          value={pendingPayments}
          description="Awaiting payment"
          icon={DollarSign}
        />
        <StatCard
          title="Monthly Revenue"
          value={formatCurrency(totalRevenue._sum?.monthlyRent || 0)}
          description="Expected monthly income"
          icon={FileText}
        />
      </div>

      {/* Recent Leases */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Active Leases</CardTitle>
              <CardDescription>Your current rental agreements</CardDescription>
            </div>
            <Link href="/leases">
              <Button variant="outline" size="sm">View All</Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {activeLeases.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No active leases</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Start by adding a property and creating a lease
              </p>
              <Link href="/properties/new">
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Property
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {activeLeases.map((lease) => (
                <div
                  key={lease.id}
                  className="flex items-center justify-between border-b last:border-0 pb-4 last:pb-0"
                >
                  <div className="space-y-1">
                    <p className="font-medium">{lease.property.name}</p>
                    <p className="text-sm text-muted-foreground">
                      Tenant: {lease.tenant.name}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(lease.startDate).toLocaleDateString()} -{" "}
                      {new Date(lease.endDate).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="font-semibold">
                        {formatCurrency(lease.monthlyRent)}/mois
                      </p>
                      <Badge variant="secondary">{lease.status}</Badge>
                    </div>
                    <Link href={`/leases/${lease.id}`}>
                      <Button variant="outline" size="sm">View</Button>
                    </Link>
                  </div>
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
            <Link href="/properties/new">
              <Button variant="outline" className="w-full justify-start h-auto py-4">
                <Building2 className="mr-2 h-4 w-4" />
                Add New Property
              </Button>
            </Link>
            <Link href="/leases/new">
              <Button variant="outline" className="w-full justify-start h-auto py-4">
                <FileText className="mr-2 h-4 w-4" />
                Create Lease
              </Button>
            </Link>
            <Link href="/payments">
              <Button variant="outline" className="w-full justify-start h-auto py-4">
                <DollarSign className="mr-2 h-4 w-4" />
                Record Payment
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
