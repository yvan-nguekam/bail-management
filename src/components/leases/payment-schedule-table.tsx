import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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

const statusLabels: Record<string, string> = {
  PENDING: "En attente",
  PAID: "Payé",
  OVERDUE: "En retard",
  CANCELLED: "Annulé",
};

const statusColors: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  PENDING: "outline",
  PAID: "default",
  OVERDUE: "destructive",
  CANCELLED: "secondary",
};

// Dates are stored at UTC midnight: format in UTC to avoid off-by-one days
const formatDay = (value: string | Date) =>
  new Date(value).toLocaleDateString("fr-FR", { timeZone: "UTC" });

const formatPeriod = (row: PaymentScheduleRow) =>
  row.periodStart && row.periodEnd
    ? `${formatDay(row.periodStart)} – ${formatDay(row.periodEnd)}`
    : "Paiement ponctuel";

export function PaymentScheduleTable({ rows }: { rows: PaymentScheduleRow[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Période</TableHead>
          <TableHead>Échéance</TableHead>
          <TableHead className="text-right">Montant</TableHead>
          {rows.some((row) => row.status) && <TableHead>Statut</TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row, index) => (
          <TableRow key={row.id ?? index}>
            <TableCell>
              {row.id ? (
                <Link href={`/payments/${row.id}`} className="hover:underline">
                  {formatPeriod(row)}
                </Link>
              ) : (
                formatPeriod(row)
              )}
            </TableCell>
            <TableCell>{formatDay(row.dueDate)}</TableCell>
            <TableCell className="text-right">
              {formatCurrency(row.amount)}
              {row.isProrated && (
                <span className="ml-1 text-xs text-muted-foreground">(prorata)</span>
              )}
            </TableCell>
            {row.status && (
              <TableCell>
                <Badge variant={statusColors[row.status] ?? "outline"}>
                  {statusLabels[row.status] ?? row.status}
                </Badge>
              </TableCell>
            )}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
