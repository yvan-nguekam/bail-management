"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { MaintenanceRequestForm } from "@/components/maintenance/maintenance-request-form";
import { ArrowLeft } from "lucide-react";

export default function NewMaintenanceRequestPage() {
  const router = useRouter();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Nouvelle demande</h1>
          <p className="text-muted-foreground">
            Signalez un problème nécessitant une intervention
          </p>
        </div>
      </div>

      <MaintenanceRequestForm />
    </div>
  );
}
