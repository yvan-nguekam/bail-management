import { Badge, type badgeVariants } from "@/components/ui/badge"
import type { VariantProps } from "class-variance-authority"

type Variant = NonNullable<VariantProps<typeof badgeVariants>["variant"]>

interface StatusMeta {
  label: string
  variant: Variant
}

// One place for every status label and tone used across the app
const STATUS: Record<string, Record<string, StatusMeta>> = {
  lease: {
    DRAFT: { label: "Brouillon", variant: "muted" },
    ACTIVE: { label: "Actif", variant: "success" },
    EXPIRED: { label: "Expiré", variant: "warning" },
    TERMINATED: { label: "Résilié", variant: "danger" },
    RENEWED: { label: "Renouvelé", variant: "info" },
  },
  payment: {
    PENDING: { label: "En attente", variant: "muted" },
    PAID: { label: "Payé", variant: "success" },
    OVERDUE: { label: "En retard", variant: "danger" },
    CANCELLED: { label: "Annulé", variant: "outline" },
  },
  property: {
    AVAILABLE: { label: "Disponible", variant: "success" },
    OCCUPIED: { label: "Occupé", variant: "info" },
    MAINTENANCE: { label: "En travaux", variant: "warning" },
    UNAVAILABLE: { label: "Indisponible", variant: "muted" },
  },
  maintenance: {
    OPEN: { label: "Ouverte", variant: "info" },
    IN_PROGRESS: { label: "En cours", variant: "warning" },
    RESOLVED: { label: "Résolue", variant: "success" },
    CLOSED: { label: "Clôturée", variant: "muted" },
    CANCELLED: { label: "Annulée", variant: "outline" },
  },
  priority: {
    LOW: { label: "Basse", variant: "muted" },
    MEDIUM: { label: "Moyenne", variant: "info" },
    HIGH: { label: "Haute", variant: "warning" },
    URGENT: { label: "Urgente", variant: "danger" },
  },
  deposit: {
    NOT_RECEIVED: { label: "Non reçue", variant: "muted" },
    HELD: { label: "Détenue", variant: "info" },
    SETTLED: { label: "Restituée", variant: "success" },
  },
}

export type StatusKind = keyof typeof STATUS

export function statusLabel(kind: StatusKind, status: string) {
  return STATUS[kind][status]?.label ?? status
}

interface StatusBadgeProps extends Omit<React.ComponentProps<typeof Badge>, "variant"> {
  kind: StatusKind
  status: string
}

export function StatusBadge({ kind, status, ...props }: StatusBadgeProps) {
  const meta = STATUS[kind][status] ?? { label: status, variant: "outline" as Variant }
  return (
    <Badge variant={meta.variant} {...props}>
      {meta.label}
    </Badge>
  )
}
