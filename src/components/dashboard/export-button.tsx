"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Download, Loader2 } from "lucide-react"
import { toast } from "sonner"
import {
  exportPaymentsToCSV,
  exportLeasesToCSV,
  exportPropertiesToCSV,
  exportRevenueReportToCSV
} from "@/lib/export"

export type ExportType = "payments" | "leases" | "properties" | "revenue"

/** Rows handed to the CSV helpers; each exporter picks the fields it needs. */
export type ExportRow = Record<string, unknown>

interface ExportButtonProps {
  type: ExportType
  data?: ExportRow[]
  filters?: Record<string, string>
  className?: string
}

export function ExportButton({ type, data, filters, className }: ExportButtonProps) {
  const [loading, setLoading] = useState(false)

  const handleExport = async () => {
    try {
      setLoading(true)

      if (data) {
        // Export provided data
        switch (type) {
          case "payments":
            exportPaymentsToCSV(data)
            break
          case "leases":
            exportLeasesToCSV(data)
            break
          case "properties":
            exportPropertiesToCSV(data)
            break
          case "revenue":
            exportRevenueReportToCSV(data)
            break
        }
      } else {
        // Fetch data from API
        const params = new URLSearchParams(filters || {})
        const response = await fetch(`/api/export/${type}?${params}`)

        if (!response.ok) {
          throw new Error("Export failed")
        }

        const fetchedData: ExportRow[] = await response.json()

        switch (type) {
          case "payments":
            exportPaymentsToCSV(fetchedData)
            break
          case "leases":
            exportLeasesToCSV(fetchedData)
            break
          case "properties":
            exportPropertiesToCSV(fetchedData)
            break
        }
      }

      toast.success("Export terminé")
    } catch (error) {
      console.error("Export error:", error)
      toast.error("L'export a échoué")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      variant="outline"
      onClick={handleExport}
      disabled={loading}
      aria-busy={loading}
      className={className}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
      ) : (
        <Download className="h-4 w-4" aria-hidden />
      )}
      {loading ? "Export en cours…" : "Exporter en CSV"}
    </Button>
  )
}
