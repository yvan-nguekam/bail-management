import { Badge } from "@/components/ui/badge";
import {
  maintenancePriorityLabels,
  maintenancePriorityVariants,
  maintenanceStatusLabels,
  maintenanceStatusVariants,
  type MaintenancePriorityValue,
  type MaintenanceStatusValue,
} from "@/lib/maintenance";

export function MaintenanceStatusBadge({ status }: { status: MaintenanceStatusValue }) {
  return (
    <Badge variant={maintenanceStatusVariants[status]}>
      {maintenanceStatusLabels[status]}
    </Badge>
  );
}

export function MaintenancePriorityBadge({
  priority,
}: {
  priority: MaintenancePriorityValue;
}) {
  return (
    <Badge variant={maintenancePriorityVariants[priority]}>
      {maintenancePriorityLabels[priority]}
    </Badge>
  );
}
