import { DetailList, EmailLayout, Paragraph } from "./_components/email-layout"
import { formatCurrency, formatEmailDate } from "./_components/format"

const METHOD_LABELS: Record<string, string> = {
  CASH: "Espèces",
  BANK_TRANSFER: "Virement bancaire",
  CREDIT_CARD: "Carte bancaire",
  CHECK: "Chèque",
  MOBILE_MONEY: "Mobile Money",
}

export interface PaymentReceivedEmailProps {
  tenantName?: string | null
  propertyName: string
  amount: number
  paidDate?: Date | string | null
  paymentMethod?: string | null
  reference?: string | null
  paymentUrl: string
}

/** Paiement reçu et confirmé par le bailleur. */
export function PaymentReceivedEmail({
  tenantName,
  propertyName,
  amount,
  paidDate,
  paymentMethod,
  reference,
  paymentUrl,
}: PaymentReceivedEmailProps) {
  const items = [
    { label: "Montant", value: formatCurrency(amount) },
    ...(paidDate ? [{ label: "Date de paiement", value: formatEmailDate(paidDate) }] : []),
    ...(paymentMethod
      ? [{ label: "Mode de paiement", value: METHOD_LABELS[paymentMethod] ?? paymentMethod }]
      : []),
    ...(reference ? [{ label: "Référence", value: reference }] : []),
  ]
  return (
    <EmailLayout
      preview={`Paiement confirmé : ${formatCurrency(amount)} pour ${propertyName}`}
      heading="Paiement confirmé"
      recipientName={tenantName}
      action={{ label: "Voir le paiement", href: paymentUrl }}
    >
      <Paragraph>Votre paiement pour {propertyName} a bien été reçu. Merci !</Paragraph>
      <DetailList items={items} />
      <Paragraph>Le reçu est disponible à tout moment depuis votre espace.</Paragraph>
    </EmailLayout>
  )
}

PaymentReceivedEmail.PreviewProps = {
  tenantName: "Aminatou Bello",
  propertyName: "Villa Bonapriso",
  amount: 150000,
  paidDate: "2026-10-03T00:00:00.000Z",
  paymentMethod: "MOBILE_MONEY",
  reference: "MM-482913",
  paymentUrl: "http://localhost:3000/payments/demo",
} satisfies PaymentReceivedEmailProps

export default PaymentReceivedEmail
