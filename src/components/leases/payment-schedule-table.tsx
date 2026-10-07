import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusBadge } from "@/components/shared/status-badge";
import { formatCurrency } from "@/lib/utils";

export interface PaymentScheduleRow {
  id?: string;
  periodStart?: string | Date | null;
  periodEnd?: string | Date | null;
  dueDate: string | Date;
  amount: number;
  status?: string;
  isProrated?: boolean;
}

// Dates are stored at UTC midnight: format in UTC to avoid off-by-one days
const formatDay = (value: string | Date) =>
  new Date(value).toLocaleDateString("fr-FR", { timeZone: "UTC" });

const formatPeriod = (row: PaymentScheduleRow) =>
  row.periodStart && row.periodEnd
    ? `${formatDay(row.periodStart)} – ${formatDay(row.periodEnd)}`
    : "Paiement ponctuel";

export function PaymentScheduleTable({ rows }: { rows: PaymentScheduleRow[] }) {
  const hasStatus = rows.some((row) => row.status);

  return (
    <Table>
      <TableHeader className="sticky top-0 z-10 bg-card">
        <TableRow className="bg-muted/40 hover:bg-muted/40">
          <TableHead className="pl-4">Période</TableHead>
          <TableHead>Échéance</TableHead>
          <TableHead className={hasStatus ? "text-right" : "pr-4 text-right"}>Montant</TableHead>
          {hasStatus && <TableHead className="pr-4">Statut</TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row, index) => (
          <TableRow key={row.id ?? index}>
            <TableCell className="pl-4 tabular-nums">
              {row.id ? (
                <Link
                  href={`/payments/${row.id}`}
                  className="rounded-sm font-medium underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                >
                  {formatPeriod(row)}
                </Link>
              ) : (
                formatPeriod(row)
              )}
            </TableCell>
            <TableCell className="tabular-nums">{formatDay(row.dueDate)}</TableCell>
            <TableCell className={hasStatus ? "text-right tabular-nums" : "pr-4 text-right tabular-nums"}>
              {formatCurrency(row.amount)}
              {row.isProrated && (
                <span className="ml-1 text-xs text-muted-foreground">(prorata)</span>
              )}
            </TableCell>
            {hasStatus && (
              <TableCell className="pr-4">
                {row.status && <StatusBadge kind="payment" status={row.status} />}
              </TableCell>
            )}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
