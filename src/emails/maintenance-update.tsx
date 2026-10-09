import { DetailList, EmailLayout, Paragraph, Quote } from "./_components/email-layout"

export type MaintenanceUpdateKind = "created" | "status" | "comment" | "assigned"

export interface MaintenanceUpdateEmailProps {
  kind: MaintenanceUpdateKind
  recipientName?: string | null
  requestTitle: string
  propertyName?: string | null
  /** Auteur de l'action (création, commentaire) */
  actorName?: string | null
  /** Libellé du nouveau statut (kind = "status") */
  statusLabel?: string | null
  /** Texte du commentaire (kind = "comment") */
  comment?: string | null
  requestUrl: string
}

const HEADINGS: Record<MaintenanceUpdateKind, string> = {
  created: "Nouvelle demande de maintenance",
  status: "Demande de maintenance mise à jour",
  comment: "Nouveau commentaire",
  assigned: "Demande de maintenance assignée",
}

/** Demande de maintenance : création, changement de statut, commentaire ou assignation. */
export function MaintenanceUpdateEmail({
  kind,
  recipientName,
  requestTitle,
  propertyName,
  actorName,
  statusLabel,
  comment,
  requestUrl,
}: MaintenanceUpdateEmailProps) {
  const heading = HEADINGS[kind]
  const intro = {
    created: `${actorName ?? "Un utilisateur"} a créé une demande de maintenance.`,
    status: `Le statut de la demande « ${requestTitle} » a changé.`,
    comment: `${actorName ?? "Un participant"} a commenté la demande « ${requestTitle} ».`,
    assigned: `La demande « ${requestTitle} » vous a été assignée.`,
  }[kind]
  const items = [
    { label: "Demande", value: requestTitle },
    ...(propertyName ? [{ label: "Bien", value: propertyName }] : []),
    ...(kind === "status" && statusLabel ? [{ label: "Nouveau statut", value: statusLabel }] : []),
  ]
  return (
    <EmailLayout
      preview={`${heading} : ${requestTitle}`}
      heading={heading}
      recipientName={recipientName}
      action={{ label: "Voir la demande", href: requestUrl }}
    >
      <Paragraph>{intro}</Paragraph>
      <DetailList items={items} />
      {kind === "comment" && comment ? <Quote>{comment}</Quote> : null}
    </EmailLayout>
  )
}

MaintenanceUpdateEmail.PreviewProps = {
  kind: "status",
  recipientName: "Aminatou Bello",
  requestTitle: "Fuite sous l'évier de la cuisine",
  propertyName: "Villa Bonapriso",
  statusLabel: "En cours",
  requestUrl: "http://localhost:3000/maintenance/demo",
} satisfies MaintenanceUpdateEmailProps

export default MaintenanceUpdateEmail
