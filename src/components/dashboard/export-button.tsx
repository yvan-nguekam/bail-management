"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Download } from "lucide-react"
import { toast } from "sonner"
import {
  exportPaymentsToCSV,
  exportLeasesToCSV,
  exportPropertiesToCSV,
  exportRevenueReportToCSV
} from "@/lib/export"

interface ExportButtonProps {
  type: "payments" | "leases" | "properties" | "revenue"
  data?: any[]
  filters?: Record<string, any>
}

export function ExportButton({ type, data, filters }: ExportButtonProps) {
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

        const fetchedData = await response.json()

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

      toast.success("Export successful")
    } catch (error) {
      console.error("Export error:", error)
      toast.error("Failed to export data")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      variant="outline"
      onClick={handleExport}
      disabled={loading}
    >
      <Download className="mr-2 h-4 w-4" />
      {loading ? "Exporting..." : "Export CSV"}
    </Button>
  )
}
