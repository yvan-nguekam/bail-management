"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Building2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  isNavItemActive,
  navigationForRole,
  settingsItem,
  type NavItem,
} from "./nav-items"

interface SidebarNavProps {
  role?: string
  onNavigate?: () => void
}

function NavLink({
  item,
  active,
  onNavigate,
}: {
  item: NavItem
  active: boolean
  onNavigate?: () => void
}) {
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group relative flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors duration-200",
        active
          ? "bg-sidebar-accent text-sidebar-accent-foreground"
          : "text-sidebar-foreground/75 hover:bg-sidebar-accent/70 hover:text-sidebar-accent-foreground"
      )}
    >
      {/* Active indicator bar */}
      <span
        aria-hidden
        className={cn(
          "absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r-full bg-sidebar-primary transition-opacity duration-200",
          active ? "opacity-100" : "opacity-0"
        )}
      />
      <item.icon
        className={cn(
          "h-4 w-4 shrink-0 transition-colors",
          active ? "text-sidebar-primary" : "text-sidebar-foreground/60 group-hover:text-sidebar-foreground"
        )}
      />
      <span className="truncate">{item.title}</span>
    </Link>
  )
}

/** Navigation list, shared by the desktop sidebar and the mobile sheet. */
export function SidebarNav({ role, onNavigate }: SidebarNavProps) {
  const pathname = usePathname()

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center border-b border-sidebar-border px-5">
        <Link href="/dashboard" onClick={onNavigate} className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
            <Building2 className="h-4 w-4" />
          </span>
          <span className="text-base font-semibold tracking-tight">RentalManager</span>
        </Link>
      </div>
      <ScrollArea className="flex-1">
        <nav aria-label="Navigation principale" className="space-y-1 p-3">
          {navigationForRole(role).map((item) => (
            <NavLink
              key={item.href}
              item={item}
              active={isNavItemActive(item, pathname)}
              onNavigate={onNavigate}
            />
          ))}
        </nav>
      </ScrollArea>
      <div className="border-t border-sidebar-border p-3">
        <NavLink
          item={settingsItem}
          active={isNavItemActive(settingsItem, pathname)}
          onNavigate={onNavigate}
        />
      </div>
    </div>
  )
}

/** Desktop sidebar (hidden below lg; the header opens a sheet instead). */
export function Sidebar({ role }: { role?: string }) {
  return (
    <aside className="hidden w-64 shrink-0 border-r border-sidebar-border bg-sidebar text-sidebar-foreground lg:block">
      <SidebarNav role={role} />
    </aside>
  )
}
