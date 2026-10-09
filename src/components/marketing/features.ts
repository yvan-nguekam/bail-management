import type { LucideIcon } from "lucide-react"
import { BarChart3, Bell, Building2, FileText, MessageSquare, Shield, Users, Wrench } from "lucide-react"

// Texts live in messages/*.json under landing.features.<key> and landing.steps.<key>
export const features = [
  { key: "properties", icon: Building2 },
  { key: "tenants", icon: Users },
  { key: "leases", icon: FileText },
  { key: "finance", icon: BarChart3 },
  { key: "maintenance", icon: Wrench },
  { key: "messaging", icon: MessageSquare },
  { key: "reminders", icon: Bell },
  { key: "security", icon: Shield },
] as const satisfies readonly { key: string; icon: LucideIcon }[]

export const steps = ["properties", "leases", "rent"] as const
export type StepKey = (typeof steps)[number]
