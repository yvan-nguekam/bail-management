import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Building2, Users, FileText, Bell, MessageSquare, Wrench, BarChart3, Shield } from "lucide-react"

export default function Home() {
  const features = [
    {
      icon: Building2,
      title: "Property Management",
      description: "Easily manage multiple properties with detailed information and images"
    },
    {
      icon: Users,
      title: "Tenant Management",
      description: "Keep track of all your tenants, their leases, and payment history"
    },
    {
      icon: FileText,
      title: "Lease Tracking",
      description: "Create, manage, and track leases with automated reminders"
    },
    {
      icon: BarChart3,
      title: "Financial Overview",
      description: "Monitor payments, track income, and generate financial reports"
    },
    {
      icon: Wrench,
      title: "Maintenance Requests",
      description: "Handle maintenance requests efficiently with priority management"
    },
    {
      icon: MessageSquare,
      title: "Communication",
      description: "Built-in messaging system for landlord-tenant communication"
    },
    {
      icon: Bell,
      title: "Smart Notifications",
      description: "Get notified about payments, lease expirations, and maintenance updates"
    },
    {
      icon: Shield,
      title: "Secure & Reliable",
      description: "Your data is protected with enterprise-level security"
    }
  ]

  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="h-6 w-6" />
            <span className="text-xl font-bold">RentalManager</span>
          </div>
          <nav className="flex items-center gap-4">
            <Link href="/auth/login">
              <Button variant="ghost">Sign In</Button>
            </Link>
            <Link href="/auth/register">
              <Button>Get Started</Button>
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container flex flex-col items-center justify-center gap-4 py-24 md:py-32">
        <div className="flex max-w-[980px] flex-col items-center gap-4 text-center">
          <h1 className="text-4xl font-extrabold leading-tight tracking-tighter md:text-6xl lg:text-7xl">
            Simplify Your Property Management
          </h1>
          <p className="max-w-[750px] text-lg text-muted-foreground sm:text-xl">
            A complete solution for landlords to manage properties, tenants, leases, and payments.
            Streamline your rental business with our modern, easy-to-use platform.
          </p>
          <div className="flex gap-4">
            <Link href="/auth/register">
              <Button size="lg" className="h-12 px-8">
                Start Free Trial
              </Button>
            </Link>
            <Link href="/auth/login">
              <Button size="lg" variant="outline" className="h-12 px-8">
                Sign In
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container py-24 md:py-32">
        <div className="flex flex-col items-center gap-4 text-center">
          <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
            Everything You Need to Manage Your Rentals
          </h2>
          <p className="max-w-[900px] text-lg text-muted-foreground">
            Powerful features designed to make property management effortless
          </p>
        </div>
        <div className="mx-auto mt-16 grid max-w-5xl grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature, index) => (
            <Card key={index} className="border-2 transition-all hover:shadow-lg">
              <CardHeader>
                <feature.icon className="h-10 w-10 text-primary" />
                <CardTitle className="mt-4">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>{feature.description}</CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="border-t bg-muted/50 py-24">
        <div className="container flex flex-col items-center gap-4 text-center">
          <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
            Ready to Get Started?
          </h2>
          <p className="max-w-[600px] text-lg text-muted-foreground">
            Join thousands of landlords who are already managing their properties more efficiently
          </p>
          <Link href="/auth/register">
            <Button size="lg" className="mt-4 h-12 px-8">
              Create Your Account
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-6 md:py-0">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            <span className="text-sm font-medium">RentalManager</span>
          </div>
          <p className="text-sm text-muted-foreground">
            © 2025 RentalManager. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  )
}
