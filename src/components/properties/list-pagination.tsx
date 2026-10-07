import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ListPaginationProps {
  page: number;
  totalPages: number;
  total: number;
  /** Libellé au singulier / pluriel, ex. ["bien", "biens"] */
  itemLabels: [string, string];
  onPageChange: (page: number) => void;
  className?: string;
}

/** Barre de pagination compacte : compte à gauche, Précédent / Suivant à droite. */
export function ListPagination({
  page,
  totalPages,
  total,
  itemLabels,
  onPageChange,
  className,
}: ListPaginationProps) {
  const label = total > 1 ? itemLabels[1] : itemLabels[0];

  return (
    <div
      className={cn(
        "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between",
        className
      )}
    >
      <p className="text-sm text-muted-foreground tabular-nums">
        <span className="font-medium text-foreground">{total}</span> {label}
        {totalPages > 1 && (
          <>
            {" "}
            · page {page} sur {totalPages}
          </>
        )}
      </p>
      {totalPages > 1 && (
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-10 flex-1 sm:h-8 sm:flex-none"
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
          >
            <ChevronLeft aria-hidden />
            Précédent
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-10 flex-1 sm:h-8 sm:flex-none"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
          >
            Suivant
            <ChevronRight aria-hidden />
          </Button>
        </div>
      )}
    </div>
  );
}
