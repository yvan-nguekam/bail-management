import { DetailList, EmailLayout, Paragraph } from "./_components/email-layout"
import { formatCurrency, formatEmailDate } from "./_components/format"

export type DepositUpdateEmailProps = {
  recipientName?: string | null
  propertyName: string
  leaseUrl: string
} & (
  | { kind: "received"; amount: number; receivedAt: Date | string }
  | {
      kind: "settled"
      settledAt: Date | string
      refundAmount: number
      totalDeductions: number
      /** Retenues au-delà de la caution, restant dues par le locataire */
      remainingDue?: number
    }
)

/** Caution (dépôt de garantie) reçue puis restituée/soldée. */
export function DepositUpdateEmail(props: DepositUpdateEmailProps) {
  const { recipientName, propertyName, leaseUrl } = props

  if (props.kind === "received") {
    return (
      <EmailLayout
        preview={`Caution reçue : ${formatCurrency(props.amount)} pour ${propertyName}`}
        heading="Caution reçue"
        recipientName={recipientName}
        action={{ label: "Voir le bail", href: leaseUrl }}
      >
        <Paragraph>Votre caution pour {propertyName} a bien été reçue.</Paragraph>
        <DetailList
          items={[
            { label: "Montant", value: formatCurrency(props.amount) },
            { label: "Reçue le", value: formatEmailDate(props.receivedAt) },
          ]}
        />
        <Paragraph>Elle vous sera restituée en fin de bail, déduction faite des éventuelles retenues justifiées.</Paragraph>
      </EmailLayout>
    )
  }

  const due = props.remainingDue ?? 0
  return (
    <EmailLayout
      preview={`Caution soldée pour ${propertyName} : ${formatCurrency(props.refundAmount)} restitués`}
      heading="Caution restituée"
      recipientName={recipientName}
      action={{ label: "Voir le détail", href: leaseUrl }}
    >
      <Paragraph>
        La caution de votre bail pour {propertyName} a été soldée le {formatEmailDate(props.settledAt)}.
      </Paragraph>
      <DetailList
        tone={due > 0 ? "danger" : "default"}
        items={[
          { label: "Montant restitué", value: formatCurrency(props.refundAmount) },
          { label: "Retenues", value: formatCurrency(props.totalDeductions) },
          ...(due > 0 ? [{ label: "Reste dû", value: formatCurrency(due) }] : []),
        ]}
      />
      {due > 0 ? (
        <Paragraph>
          Les retenues dépassent le montant de la caution : {formatCurrency(due)} restent à régler.
        </Paragraph>
      ) : null}
    </EmailLayout>
  )
}

DepositUpdateEmail.PreviewProps = {
  kind: "settled",
  recipientName: "Aminatou Bello",
  propertyName: "Villa Bonapriso",
  leaseUrl: "http://localhost:3000/leases/demo",
  settledAt: "2026-10-15T00:00:00.000Z",
  refundAmount: 250000,
  totalDeductions: 50000,
} satisfies DepositUpdateEmailProps

export default DepositUpdateEmail
