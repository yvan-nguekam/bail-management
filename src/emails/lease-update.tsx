import { DetailList, EmailLayout, Paragraph } from "./_components/email-layout"
import { formatCurrency, formatEmailDate } from "./_components/format"

export type LeaseUpdateKind = "created" | "activated" | "renewed" | "terminated"

export interface LeaseUpdateEmailProps {
  kind: LeaseUpdateKind
  recipientName?: string | null
  propertyName: string
  startDate?: Date | string | null
  endDate?: Date | string | null
  monthlyRent?: number | null
  /** Motif de résiliation, le cas échéant */
  reason?: string | null
  leaseUrl: string
}

const COPY: Record<LeaseUpdateKind, { heading: string; intro: (property: string) => string }> = {
  created: {
    heading: "Nouveau bail",
    intro: (p) => `Un bail a été établi à votre nom pour ${p}. Vous pouvez en consulter le détail et le contrat depuis votre espace.`,
  },
  activated: {
    heading: "Bail en vigueur",
    intro: (p) => `Votre bail pour ${p} est désormais en vigueur.`,
  },
  renewed: {
    heading: "Bail renouvelé",
    intro: (p) => `Votre bail pour ${p} a été renouvelé. Les nouvelles échéances sont disponibles dans votre espace.`,
  },
  terminated: {
    heading: "Bail résilié",
    intro: (p) => `Votre bail pour ${p} a été résilié.`,
  },
}

/** Événements de cycle de vie d'un bail : création, activation, renouvellement, résiliation. */
export function LeaseUpdateEmail({
  kind,
  recipientName,
  propertyName,
  startDate,
  endDate,
  monthlyRent,
  reason,
  leaseUrl,
}: LeaseUpdateEmailProps) {
  const copy = COPY[kind]
  const items = [
    { label: "Bien", value: propertyName },
    ...(startDate ? [{ label: "Début", value: formatEmailDate(startDate) }] : []),
    ...(endDate
      ? [{ label: kind === "terminated" ? "Date de fin" : "Fin prévue", value: formatEmailDate(endDate) }]
      : []),
    ...(monthlyRent ? [{ label: "Loyer mensuel", value: formatCurrency(monthlyRent) }] : []),
    ...(reason ? [{ label: "Motif", value: reason }] : []),
  ]
  return (
    <EmailLayout
      preview={`${copy.heading} : ${propertyName}`}
      heading={copy.heading}
      recipientName={recipientName}
      action={{ label: "Voir le bail", href: leaseUrl }}
    >
      <Paragraph>{copy.intro(propertyName)}</Paragraph>
      <DetailList items={items} />
    </EmailLayout>
  )
}

LeaseUpdateEmail.PreviewProps = {
  kind: "created",
  recipientName: "Aminatou Bello",
  propertyName: "Villa Bonapriso",
  startDate: "2026-11-01T00:00:00.000Z",
  endDate: "2027-10-31T00:00:00.000Z",
  monthlyRent: 150000,
  leaseUrl: "http://localhost:3000/leases/demo",
} satisfies LeaseUpdateEmailProps

export default LeaseUpdateEmail
