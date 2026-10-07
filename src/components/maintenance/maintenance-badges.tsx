import { StatusBadge } from "@/components/shared/status-badge";
import type { MaintenancePriorityValue, MaintenanceStatusValue } from "@/lib/maintenance";

type BadgeProps = Omit<React.ComponentProps<typeof StatusBadge>, "kind" | "status">;

/** Pastille de statut d'une demande — enveloppe fine autour du StatusBadge partagé. */
export function MaintenanceStatusBadge({
  status,
  ...props
}: BadgeProps & { status: MaintenanceStatusValue }) {
  return <StatusBadge kind="maintenance" status={status} {...props} />;
}

/** Pastille de priorité d'une demande — enveloppe fine autour du StatusBadge partagé. */
export function MaintenancePriorityBadge({
  priority,
  ...props
}: BadgeProps & { priority: MaintenancePriorityValue }) {
  return <StatusBadge kind="priority" status={priority} {...props} />;
}
