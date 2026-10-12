import { DetailList, EmailLayout, Paragraph } from "./_components/email-layout"
import { formatCurrency, formatEmailDate } from "./_components/format"

export interface PaymentOverdueEmailProps {
  tenantName?: string | null
  propertyName: string
  amount: number
  dueDate: Date | string
  paymentUrl: string
}

/** Loyer en retard (passage en OVERDUE par la tâche quotidienne). */
export function PaymentOverdueEmail({
  tenantName,
  propertyName,
  amount,
  dueDate,
  paymentUrl,
}: PaymentOverdueEmailProps) {
  return (
    <EmailLayout
      preview={`Loyer en retard : ${formatCurrency(amount)} pour ${propertyName}`}
      heading="Loyer en retard"
      recipientName={tenantName}
      action={{ label: "Voir le paiement", href: paymentUrl }}
    >
      <Paragraph>
        Le loyer pour {propertyName}, dû le {formatEmailDate(dueDate)}, n&apos;a pas encore été
        enregistré comme payé.
      </Paragraph>
      <DetailList
        tone="danger"
        items={[
          { label: "Montant", value: formatCurrency(amount) },
          { label: "Échéance dépassée", value: formatEmailDate(dueDate) },
        ]}
      />
      <Paragraph>
        Merci de régulariser la situation au plus vite ou de contacter votre bailleur. Si le
        paiement a déjà été effectué, il sera pris en compte dès sa validation.
      </Paragraph>
    </EmailLayout>
  )
}

PaymentOverdueEmail.PreviewProps = {
  tenantName: "Aminatou Bello",
  propertyName: "Villa Bonapriso",
  amount: 150000,
  dueDate: "2026-10-05T00:00:00.000Z",
  paymentUrl: "http://localhost:3000/payments/demo",
} satisfies PaymentOverdueEmailProps

export default PaymentOverdueEmail
