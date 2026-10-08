import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FormActionsProps {
  submitLabel: string;
  isSubmitting: boolean;
  onCancel: () => void;
}

/** Barre d'envoi des formulaires : Annuler + action principale, spinner pendant l'envoi. */
export function FormActions({ submitLabel, isSubmitting, onCancel }: FormActionsProps) {
  return (
    <div className="animate-fade-up flex flex-col-reverse gap-2 border-t pt-6 sm:flex-row sm:justify-end">
      <Button
        type="button"
        variant="outline"
        className="h-10 sm:h-9"
        onClick={onCancel}
        disabled={isSubmitting}
      >
        Annuler
      </Button>
      <Button type="submit" className="h-10 sm:h-9" disabled={isSubmitting}>
        {isSubmitting && <Loader2 className="animate-spin" aria-hidden />}
        {submitLabel}
      </Button>
    </div>
  );
}
