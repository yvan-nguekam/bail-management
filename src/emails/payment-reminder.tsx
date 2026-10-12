import { DetailList, EmailLayout, Paragraph } from "./_components/email-layout"
import { formatCurrency, formatEmailDate } from "./_components/format"

export interface PaymentReminderEmailProps {
  tenantName?: string | null
  propertyName: string
  amount: number
  dueDate: Date | string
  paymentUrl: string
  /** Nombre de jours avant l'échéance (rappel J-3) ; absent pour un nouvel appel de loyer */
  daysLeft?: number
}

/** Loyer à payer : nouvel appel de loyer ou rappel quelques jours avant l'échéance. */
export function PaymentReminderEmail({
  tenantName,
  propertyName,
  amount,
  dueDate,
  paymentUrl,
  daysLeft,
}: PaymentReminderEmailProps) {
  const heading = daysLeft !== undefined ? "Loyer bientôt dû" : "Nouveau loyer à régler"
  return (
    <EmailLayout
      preview={`${heading} : ${formatCurrency(amount)} pour ${propertyName}`}
      heading={heading}
      recipientName={tenantName}
      action={{ label: "Voir le paiement", href: paymentUrl }}
    >
      <Paragraph>
        {daysLeft !== undefined
          ? `Votre loyer pour ${propertyName} arrive à échéance dans ${daysLeft} jour${daysLeft > 1 ? "s" : ""}.`
          : `Un loyer est à régler pour ${propertyName}.`}
      </Paragraph>
      <DetailList
        items={[
          { label: "Montant", value: formatCurrency(amount) },
          { label: "Échéance", value: formatEmailDate(dueDate) },
        ]}
      />
      <Paragraph>Si vous avez déjà réglé ce montant, vous pouvez ignorer ce message.</Paragraph>
    </EmailLayout>
  )
}

PaymentReminderEmail.PreviewProps = {
  tenantName: "Aminatou Bello",
  propertyName: "Villa Bonapriso",
  amount: 150000,
  dueDate: "2026-11-05T00:00:00.000Z",
  paymentUrl: "http://localhost:3000/payments/demo",
  daysLeft: 3,
} satisfies PaymentReminderEmailProps

export default PaymentReminderEmail
