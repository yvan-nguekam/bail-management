import {
  BarChart3,
  Building2,
  CreditCard,
  FileText,
  FolderOpen,
  LayoutDashboard,
  MessageSquare,
  Settings,
  Users,
  Wrench,
  type LucideIcon,
} from "lucide-react"

export interface NavItem {
  title: string
  href: string
  icon: LucideIcon
  roles?: string[]
}

const STAFF = ["ADMIN", "LANDLORD", "MANAGER"]

export const navigation: NavItem[] = [
  { title: "Tableau de bord", href: "/dashboard", icon: LayoutDashboard },
  { title: "Biens", href: "/properties", icon: Building2, roles: STAFF },
  { title: "Baux", href: "/leases", icon: FileText },
  { title: "Locataires", href: "/tenants", icon: Users, roles: STAFF },
  { title: "Paiements", href: "/payments", icon: CreditCard },
  { title: "Maintenance", href: "/maintenance", icon: Wrench },
  { title: "Messages", href: "/messages", icon: MessageSquare },
  { title: "Documents", href: "/documents", icon: FolderOpen },
  { title: "Rapports", href: "/reports", icon: BarChart3, roles: STAFF },
]

export const settingsItem: NavItem = { title: "Paramètres", href: "/settings", icon: Settings }

// Dashboard variants share the "Tableau de bord" entry
const DASHBOARD_PATHS = ["/dashboard", "/landlord", "/tenant", "/admin"]

export function navigationForRole(role?: string) {
  return navigation.filter((item) => !item.roles || !role || item.roles.includes(role))
}

export function isNavItemActive(item: NavItem, pathname: string) {
  const path = pathname.replace(/^\/(en|fr)(?=\/|$)/, "") || "/"
  if (item.href === "/dashboard") {
    return DASHBOARD_PATHS.some((p) => path === p || path.startsWith(p + "/"))
  }
  return path === item.href || path.startsWith(item.href + "/")
}

export function currentNavItem(pathname: string, role?: string) {
  return [...navigationForRole(role), settingsItem].find((item) => isNavItemActive(item, pathname))
}
