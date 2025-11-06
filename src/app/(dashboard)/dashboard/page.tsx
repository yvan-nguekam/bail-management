import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect("/auth/login")
  }

  const role = session.user.role

  // Redirect based on user role
  switch (role) {
    case "ADMIN":
      redirect("/admin")
    case "LANDLORD":
    case "MANAGER":
      redirect("/landlord")
    case "TENANT":
      redirect("/tenant")
    default:
      redirect("/auth/login")
  }
}
