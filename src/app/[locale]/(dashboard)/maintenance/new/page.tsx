"use client";

import { PageHeader } from "@/components/shared/page-header";
import { MaintenanceRequestForm } from "@/components/maintenance/maintenance-request-form";

export default function NewMaintenanceRequestPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Nouvelle demande"
        description="Signalez un problème nécessitant une intervention"
        backHref="/maintenance"
      />

      <MaintenanceRequestForm />
    </div>
  );
}
