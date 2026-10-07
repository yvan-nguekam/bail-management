import type {
  MaintenancePriorityValue,
  MaintenanceStatusValue,
  UserRoleValue,
} from "@/lib/maintenance";

export interface UserSummary {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
}

export interface MaintenanceListItem {
  id: string;
  title: string;
  status: MaintenanceStatusValue;
  priority: MaintenancePriorityValue;
  category: string | null;
  createdAt: string;
  property: { id: string; name: string; address: string; city: string };
  tenant: UserSummary;
  assignedTo: UserSummary | null;
  comments: Array<{ id: string }>;
}

export type MaintenanceStats = Record<MaintenanceStatusValue, number>;

export interface MaintenanceComment {
  id: string;
  content: string;
  authorId: string;
  authorName: string;
  authorRole: UserRoleValue;
  createdAt: string;
  author: UserSummary;
}

export interface MaintenanceDetail {
  id: string;
  title: string;
  description: string;
  status: MaintenanceStatusValue;
  priority: MaintenancePriorityValue;
  category: string | null;
  scheduledDate: string | null;
  cost: number | null;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
  tenantId: string;
  assignedToId: string | null;
  property: {
    id: string;
    name: string;
    address: string;
    city: string;
    ownerId: string;
    managerId: string | null;
    owner: UserSummary;
    manager: UserSummary | null;
  };
  tenant: UserSummary;
  assignedTo: UserSummary | null;
  comments: MaintenanceComment[];
}
