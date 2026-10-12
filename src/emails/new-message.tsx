import { EmailLayout, Paragraph, Quote } from "./_components/email-layout"

const EXCERPT_LENGTH = 400

export interface NewMessageEmailProps {
  recipientName?: string | null
  senderName: string
  subject: string
  content: string
  messageUrl: string
}

/** Nouveau message reçu dans la messagerie (extrait, la réponse se fait dans l'application). */
export function NewMessageEmail({
  recipientName,
  senderName,
  subject,
  content,
  messageUrl,
}: NewMessageEmailProps) {
  const excerpt =
    content.length > EXCERPT_LENGTH ? `${content.slice(0, EXCERPT_LENGTH).trimEnd()}…` : content
  return (
    <EmailLayout
      preview={`${senderName} : ${subject}`}
      heading="Nouveau message"
      recipientName={recipientName}
      action={{ label: "Lire et répondre", href: messageUrl }}
    >
      <Paragraph>
        {senderName} vous a envoyé un message : <strong>{subject}</strong>
      </Paragraph>
      <Quote>{excerpt}</Quote>
      <Paragraph>Pour répondre, utilisez la messagerie de l&apos;application.</Paragraph>
    </EmailLayout>
  )
}

NewMessageEmail.PreviewProps = {
  recipientName: "Aminatou Bello",
  senderName: "Marie-Claire Ngo Bassong",
  subject: "Visite d'entretien de la climatisation",
  content:
    "Bonjour,\nLe technicien passera jeudi matin entre 9 h et 11 h pour l'entretien annuel. Merci de me dire si ce créneau vous convient.",
  messageUrl: "http://localhost:3000/messages/demo",
} satisfies NewMessageEmailProps

export default NewMessageEmail
