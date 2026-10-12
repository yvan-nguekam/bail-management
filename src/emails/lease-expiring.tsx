import { DetailList, EmailLayout, Paragraph } from "./_components/email-layout"
import { formatEmailDate } from "./_components/format"

export interface LeaseExpiringEmailProps {
  recipientName?: string | null
  propertyName: string
  endDate: Date | string
  daysLeft: number
  /** Le destinataire est le locataire (sinon bailleur/gestionnaire) */
  isTenant: boolean
  leaseUrl: string
}

/** Fin de bail proche (préavis à 60 puis 30 jours). */
export function LeaseExpiringEmail({
  recipientName,
  propertyName,
  endDate,
  daysLeft,
  isTenant,
  leaseUrl,
}: LeaseExpiringEmailProps) {
  const days = `${daysLeft} jour${daysLeft > 1 ? "s" : ""}`
  return (
    <EmailLayout
      preview={`Le bail de ${propertyName} se termine dans ${days}`}
      heading="Fin de bail proche"
      recipientName={recipientName}
      action={{ label: "Voir le bail", href: leaseUrl }}
    >
      <Paragraph>
        Le bail pour {propertyName} se termine le {formatEmailDate(endDate)}, dans {days}.
      </Paragraph>
      <DetailList
        items={[
          { label: "Bien", value: propertyName },
          { label: "Fin du bail", value: formatEmailDate(endDate) },
        ]}
      />
      <Paragraph>
        {isTenant
          ? "Si vous souhaitez rester, rapprochez-vous de votre bailleur pour un renouvellement ; sinon, pensez à organiser votre départ."
          : "Pensez à proposer un renouvellement au locataire ou à préparer l'état des lieux de sortie."}
      </Paragraph>
    </EmailLayout>
  )
}

LeaseExpiringEmail.PreviewProps = {
  recipientName: "Aminatou Bello",
  propertyName: "Villa Bonapriso",
  endDate: "2026-11-30T00:00:00.000Z",
  daysLeft: 30,
  isTenant: true,
  leaseUrl: "http://localhost:3000/leases/demo",
} satisfies LeaseExpiringEmailProps

export default LeaseExpiringEmail
