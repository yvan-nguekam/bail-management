import { DetailList, EmailLayout, Paragraph } from "./_components/email-layout"
import { formatEmailDate } from "./_components/format"

export interface LeaseExpiredEmailProps {
  recipientName?: string | null
  propertyName: string
  endDate: Date | string
  isTenant: boolean
  leaseUrl: string
}

/** Bail arrivé à échéance (passage en EXPIRED par la tâche quotidienne). */
export function LeaseExpiredEmail({
  recipientName,
  propertyName,
  endDate,
  isTenant,
  leaseUrl,
}: LeaseExpiredEmailProps) {
  return (
    <EmailLayout
      preview={`Le bail de ${propertyName} a expiré`}
      heading="Bail expiré"
      recipientName={recipientName}
      action={{ label: "Voir le bail", href: leaseUrl }}
    >
      <Paragraph>
        Le bail pour {propertyName} est arrivé à son terme le {formatEmailDate(endDate)}.
      </Paragraph>
      <DetailList
        items={[
          { label: "Bien", value: propertyName },
          { label: "Date de fin", value: formatEmailDate(endDate) },
        ]}
      />
      <Paragraph>
        {isTenant
          ? "Pour toute question sur la restitution de la caution ou un éventuel renouvellement, contactez votre bailleur."
          : "Vous pouvez désormais renouveler le bail, solder la caution ou remettre le bien en location."}
      </Paragraph>
    </EmailLayout>
  )
}

LeaseExpiredEmail.PreviewProps = {
  recipientName: "Marie-Claire Ngo Bassong",
  propertyName: "Villa Bonapriso",
  endDate: "2026-09-30T00:00:00.000Z",
  isTenant: false,
  leaseUrl: "http://localhost:3000/leases/demo",
} satisfies LeaseExpiredEmailProps

export default LeaseExpiredEmail
