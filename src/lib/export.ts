/**
 * Export utilities for CSV and Excel files
 */

export function generateCSV(data: any[], headers: string[]): string {
  const csvRows = []

  // Add header row
  csvRows.push(headers.join(","))

  // Add data rows
  for (const row of data) {
    const values = headers.map((header) => {
      const value = row[header]
      // Escape quotes and wrap in quotes if contains comma
      const escaped = String(value).replace(/"/g, '""')
      return escaped.includes(",") ? `"${escaped}"` : escaped
    })
    csvRows.push(values.join(","))
  }

  return csvRows.join("\n")
}

export function downloadCSV(data: any[], headers: string[], filename: string) {
  const csv = generateCSV(data, headers)
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
  const link = document.createElement("a")

  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    link.setAttribute("download", filename)
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }
}

export function exportPaymentsToCSV(payments: any[]) {
  const headers = [
    "id",
    "amount",
    "status",
    "dueDate",
    "paidDate",
    "method",
    "transactionId",
    "leaseId",
    "propertyName",
    "tenantName"
  ]

  const data = payments.map((payment) => ({
    id: payment.id,
    amount: payment.amount,
    status: payment.status,
    dueDate: new Date(payment.dueDate).toLocaleDateString(),
    paidDate: payment.paidDate ? new Date(payment.paidDate).toLocaleDateString() : "",
    method: payment.paymentMethod || "",
    transactionId: payment.transactionId || "",
    leaseId: payment.leaseId,
    propertyName: payment.lease?.property?.name || "",
    tenantName: payment.lease?.tenant?.name || ""
  }))

  const filename = `payments-${new Date().toISOString().split("T")[0]}.csv`
  downloadCSV(data, headers, filename)
}

export function exportLeasesToCSV(leases: any[]) {
  const headers = [
    "id",
    "status",
    "startDate",
    "endDate",
    "monthlyRent",
    "securityDeposit",
    "propertyName",
    "tenantName",
    "tenantEmail"
  ]

  const data = leases.map((lease) => ({
    id: lease.id,
    status: lease.status,
    startDate: new Date(lease.startDate).toLocaleDateString(),
    endDate: new Date(lease.endDate).toLocaleDateString(),
    monthlyRent: lease.monthlyRent,
    securityDeposit: lease.securityDeposit,
    propertyName: lease.property?.name || "",
    tenantName: lease.tenant?.name || "",
    tenantEmail: lease.tenant?.email || ""
  }))

  const filename = `leases-${new Date().toISOString().split("T")[0]}.csv`
  downloadCSV(data, headers, filename)
}

export function exportPropertiesToCSV(properties: any[]) {
  const headers = [
    "id",
    "name",
    "type",
    "address",
    "city",
    "state",
    "postalCode",
    "bedrooms",
    "bathrooms",
    "size",
    "status",
    "monthlyRent"
  ]

  const data = properties.map((property) => ({
    id: property.id,
    name: property.name,
    type: property.type,
    address: property.address,
    city: property.city,
    state: property.state,
    postalCode: property.postalCode,
    bedrooms: property.bedrooms,
    bathrooms: property.bathrooms,
    size: property.size,
    status: property.status,
    monthlyRent: property.monthlyRent
  }))

  const filename = `properties-${new Date().toISOString().split("T")[0]}.csv`
  downloadCSV(data, headers, filename)
}

export function exportRevenueReportToCSV(data: any[]) {
  const headers = [
    "month",
    "totalRevenue",
    "paidAmount",
    "pendingAmount",
    "overdueAmount"
  ]

  const csvData = data.map((item) => ({
    month: item.month,
    totalRevenue: item.total,
    paidAmount: item.paid,
    pendingAmount: item.pending,
    overdueAmount: item.overdue
  }))

  const filename = `revenue-report-${new Date().toISOString().split("T")[0]}.csv`
  downloadCSV(csvData, headers, filename)
}
