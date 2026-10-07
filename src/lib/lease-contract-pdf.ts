// Lease contract ("contrat de bail") PDF rendering with jsPDF.
// All content is prepared by buildLeaseContractData (pure, tested); this file only draws it.

import jsPDF from "jspdf"
import {
  buildLeaseContractData,
  type ContractParty,
  type LeaseContractData,
  type LeaseContractInput,
} from "@/lib/lease-contract"

const PAGE_WIDTH = 210
const PAGE_HEIGHT = 297
const MARGIN_X = 20
const MARGIN_TOP = 20
const MARGIN_BOTTOM = 22 // leaves room for the footer
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_X * 2
const LINE_HEIGHT = 5

class ContractWriter {
  y = MARGIN_TOP

  constructor(private readonly doc: jsPDF) {}

  ensureSpace(height: number) {
    if (this.y + height > PAGE_HEIGHT - MARGIN_BOTTOM) {
      this.doc.addPage()
      this.y = MARGIN_TOP
    }
  }

  heading(text: string) {
    this.ensureSpace(LINE_HEIGHT * 4) // keep a heading with at least a couple of lines
    this.y += 4
    this.doc.setFont("helvetica", "bold")
    this.doc.setFontSize(12)
    this.doc.text(text, MARGIN_X, this.y)
    this.y += 2
    this.doc.setLineWidth(0.2)
    this.doc.line(MARGIN_X, this.y, PAGE_WIDTH - MARGIN_X, this.y)
    this.y += LINE_HEIGHT + 1
  }

  /** Wrapped paragraph, page breaks handled line by line. */
  paragraph(text: string, options: { bold?: boolean; indent?: number } = {}) {
    const indent = options.indent ?? 0
    this.doc.setFont("helvetica", options.bold ? "bold" : "normal")
    this.doc.setFontSize(10)
    const lines: string[] = this.doc.splitTextToSize(text, CONTENT_WIDTH - indent)
    for (const line of lines) {
      this.ensureSpace(LINE_HEIGHT)
      this.doc.text(line, MARGIN_X + indent, this.y)
      this.y += LINE_HEIGHT
    }
  }

  /** "Label : value" line with a bold label; the value wraps under itself. */
  field(label: string, value: string) {
    const labelText = `${label} : `
    this.doc.setFontSize(10)
    this.doc.setFont("helvetica", "bold")
    const labelWidth = this.doc.getTextWidth(labelText)
    this.doc.setFont("helvetica", "normal")
    const lines: string[] = this.doc.splitTextToSize(value, CONTENT_WIDTH - labelWidth)
    lines.forEach((line, index) => {
      this.ensureSpace(LINE_HEIGHT)
      if (index === 0) {
        this.doc.setFont("helvetica", "bold")
        this.doc.text(labelText, MARGIN_X, this.y)
        this.doc.setFont("helvetica", "normal")
      }
      this.doc.text(line, MARGIN_X + labelWidth, this.y)
      this.y += LINE_HEIGHT
    })
  }

  space(height = LINE_HEIGHT / 2) {
    this.y += height
  }
}

function drawParty(writer: ContractWriter, title: string, person: ContractParty) {
  writer.paragraph(title, { bold: true })
  writer.field("Nom", person.name)
  writer.field("Email", person.email)
  writer.field("Téléphone", person.phone)
  writer.space()
}

function drawSignatures(doc: jsPDF, writer: ContractWriter) {
  const blockHeight = 45
  // Keep the whole signature section (heading, "Fait à", boxes) on one page
  writer.ensureSpace(blockHeight + 35)
  writer.heading("Signatures")
  writer.paragraph("Fait en deux exemplaires originaux, un pour chacune des parties.")
  writer.space()
  writer.paragraph("Fait à ______________________________, le ____________________")
  writer.space(LINE_HEIGHT)

  writer.ensureSpace(blockHeight)
  const columnWidth = (CONTENT_WIDTH - 10) / 2
  const columns: Array<[number, string]> = [
    [MARGIN_X, "Le Bailleur"],
    [MARGIN_X + columnWidth + 10, "Le Locataire"],
  ]
  const top = writer.y
  for (const [x, label] of columns) {
    doc.setFont("helvetica", "bold")
    doc.setFontSize(10)
    doc.text(label, x, top)
    doc.setFont("helvetica", "italic")
    doc.setFontSize(8)
    doc.text("(signature précédée de la mention « Lu et approuvé »)", x, top + 4, {
      maxWidth: columnWidth,
    })
    doc.setLineWidth(0.2)
    doc.rect(x, top + 8, columnWidth, 30)
  }
  writer.y = top + blockHeight
}

function drawFooters(doc: jsPDF, data: LeaseContractData) {
  const pageCount = doc.getNumberOfPages()
  for (let page = 1; page <= pageCount; page++) {
    doc.setPage(page)
    doc.setFont("helvetica", "normal")
    doc.setFontSize(8)
    doc.text(`Contrat de bail - Réf. ${data.reference}`, MARGIN_X, PAGE_HEIGHT - 10)
    doc.text(`Page ${page} / ${pageCount}`, PAGE_WIDTH - MARGIN_X, PAGE_HEIGHT - 10, {
      align: "right",
    })
  }
}

export function renderLeaseContract(data: LeaseContractData): jsPDF {
  const doc = new jsPDF({ unit: "mm", format: "a4" })
  const writer = new ContractWriter(doc)

  // Title
  doc.setFont("helvetica", "bold")
  doc.setFontSize(20)
  doc.text("Contrat de bail", PAGE_WIDTH / 2, writer.y + 5, { align: "center" })
  writer.y += 13
  doc.setFont("helvetica", "normal")
  doc.setFontSize(9)
  doc.text(`Référence : ${data.reference}`, PAGE_WIDTH / 2, writer.y, { align: "center" })
  writer.y += 4
  doc.text(`Document généré le ${data.generatedOn}`, PAGE_WIDTH / 2, writer.y, {
    align: "center",
  })
  writer.y += 4

  // Parties
  writer.heading("1. Les parties")
  drawParty(writer, "Le Bailleur", data.landlord)
  drawParty(writer, "Le Locataire", data.tenant)

  // Property
  writer.heading("2. Désignation du bien")
  writer.field("Bien", data.property.name)
  writer.field("Type", data.property.typeLabel)
  writer.field("Adresse", data.property.addressLines.join(", ") || "Non renseignée")
  for (const detail of data.property.details) {
    writer.field(detail.label, detail.value)
  }

  // Duration
  writer.heading("3. Durée du bail")
  writer.paragraph(
    `Le présent bail est consenti pour une durée de ${data.duration.label}, ` +
      `du ${data.duration.startDate} au ${data.duration.endDate} inclus.`
  )
  writer.field("Date de prise d'effet", data.duration.startDate)
  writer.field("Date de fin", data.duration.endDate)
  writer.field("Durée", data.duration.label)

  // Financial terms
  writer.heading("4. Conditions financières")
  writer.field("Loyer mensuel", data.financial.monthlyRent)
  writer.field("Paiement du loyer", data.financial.paymentDay)
  writer.field("Dépôt de garantie (caution)", data.financial.securityDeposit)
  if (data.financial.installments) {
    writer.field("Nombre d'échéances", String(data.financial.installments.count))
    writer.field("Montant total des loyers", data.financial.installments.total)
  }

  // Particular terms
  writer.heading("5. Conditions particulières")
  if (data.terms) {
    for (const block of data.terms.split("\n")) {
      if (block.trim()) {
        writer.paragraph(block)
      } else {
        writer.space()
      }
    }
  } else {
    writer.paragraph("Aucune condition particulière.")
  }

  drawSignatures(doc, writer)
  drawFooters(doc, data)

  return doc
}

export function generateLeaseContract(lease: LeaseContractInput): {
  doc: jsPDF
  fileName: string
} {
  const data = buildLeaseContractData(lease)
  return { doc: renderLeaseContract(data), fileName: data.fileName }
}

export function downloadLeaseContract(lease: LeaseContractInput) {
  const { doc, fileName } = generateLeaseContract(lease)
  doc.save(fileName)
}
