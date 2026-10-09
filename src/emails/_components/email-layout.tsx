import type { ReactNode } from "react"
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components"
import {
  APP_NAME,
  NOTIFICATION_SETTINGS_PATH,
  absoluteUrl,
} from "../../lib/notification-preferences"

// Couleurs en dur : les clients e-mail ne connaissent pas les variables CSS.
// Accent sarcelle sobre, fond clair lisible dans tous les clients.
export const emailColors = {
  accent: "#0f766e",
  accentSoft: "#f0fdfa",
  text: "#1f2937",
  muted: "#6b7280",
  border: "#e5e7eb",
  background: "#f4f6f8",
  card: "#ffffff",
  danger: "#b91c1c",
  dangerSoft: "#fef2f2",
} as const

const fontFamily =
  '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif'

export interface EmailLayoutProps {
  /** Texte d'aperçu affiché par le client e-mail à côté de l'objet */
  preview: string
  heading: string
  /** Prénom/nom du destinataire pour la salutation (facultatif) */
  recipientName?: string | null
  children: ReactNode
  action?: { label: string; href: string }
  /** Motif d'envoi affiché dans le pied de page */
  reason?: string
}

export function EmailLayout({
  preview,
  heading,
  recipientName,
  children,
  action,
  reason = "les notifications par e-mail y sont activées",
}: EmailLayoutProps) {
  return (
    <Html lang="fr">
      <Head />
      <Preview>{preview}</Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Section style={styles.brand}>
            <Text style={styles.brandText}>
              <span style={styles.brandMark}>■</span> {APP_NAME}
            </Text>
          </Section>

          <Section style={styles.card}>
            <Heading as="h1" style={styles.heading}>
              {heading}
            </Heading>
            {recipientName ? <Text style={styles.text}>Bonjour {recipientName},</Text> : null}
            {children}
            {action ? (
              <Section style={styles.actionSection}>
                <Button href={action.href} style={styles.button}>
                  {action.label}
                </Button>
              </Section>
            ) : null}
          </Section>

          <Section style={styles.footer}>
            <Text style={styles.footerText}>
              Vous recevez cet e-mail car vous avez un compte {APP_NAME} et {reason}.
            </Text>
            <Text style={styles.footerText}>
              <Link href={absoluteUrl(NOTIFICATION_SETTINGS_PATH)} style={styles.footerLink}>
                Gérer mes préférences de notification
              </Link>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

/** Paragraphe standard du corps de l'e-mail. */
export function Paragraph({ children }: { children: ReactNode }) {
  return <Text style={styles.text}>{children}</Text>
}

/** Encadré de détails "libellé : valeur" (montant, échéance, bien…). */
export function DetailList({
  items,
  tone = "default",
}: {
  items: { label: string; value: ReactNode }[]
  tone?: "default" | "danger"
}) {
  const box = tone === "danger" ? { ...styles.details, ...styles.detailsDanger } : styles.details
  return (
    <Section style={box}>
      {items.map((item) => (
        <Text key={item.label} style={styles.detailRow}>
          <span style={styles.detailLabel}>{item.label} : </span>
          <strong>{item.value}</strong>
        </Text>
      ))}
    </Section>
  )
}

/** Citation (extrait de message, commentaire…). */
export function Quote({ children }: { children: ReactNode }) {
  return (
    <Section style={styles.quote}>
      <Text style={styles.quoteText}>{children}</Text>
    </Section>
  )
}

export function Divider() {
  return <Hr style={styles.hr} />
}

const styles = {
  body: { backgroundColor: emailColors.background, fontFamily, margin: 0, padding: "24px 0" },
  container: { maxWidth: "560px", margin: "0 auto", padding: "0 12px" },
  brand: { padding: "8px 4px 16px" },
  brandText: {
    color: emailColors.accent,
    fontSize: "18px",
    fontWeight: 700,
    letterSpacing: "-0.01em",
    margin: 0,
  },
  brandMark: { color: emailColors.accent, fontSize: "14px" },
  card: {
    backgroundColor: emailColors.card,
    border: `1px solid ${emailColors.border}`,
    borderTop: `3px solid ${emailColors.accent}`,
    borderRadius: "8px",
    padding: "28px 28px 20px",
  },
  heading: {
    color: emailColors.text,
    fontSize: "22px",
    fontWeight: 600,
    lineHeight: "30px",
    margin: "0 0 16px",
  },
  text: { color: emailColors.text, fontSize: "15px", lineHeight: "24px", margin: "0 0 14px" },
  details: {
    backgroundColor: emailColors.accentSoft,
    border: `1px solid ${emailColors.border}`,
    borderRadius: "6px",
    margin: "8px 0 18px",
    padding: "12px 16px",
  },
  detailsDanger: { backgroundColor: emailColors.dangerSoft },
  detailRow: { color: emailColors.text, fontSize: "14px", lineHeight: "22px", margin: "4px 0" },
  detailLabel: { color: emailColors.muted },
  quote: {
    borderLeft: `3px solid ${emailColors.border}`,
    margin: "8px 0 18px",
    padding: "4px 0 4px 14px",
  },
  quoteText: {
    color: emailColors.muted,
    fontSize: "14px",
    lineHeight: "22px",
    margin: 0,
    whiteSpace: "pre-line" as const,
  },
  actionSection: { margin: "8px 0 12px" },
  button: {
    backgroundColor: emailColors.accent,
    borderRadius: "6px",
    color: "#ffffff",
    display: "inline-block",
    fontSize: "15px",
    fontWeight: 600,
    padding: "12px 20px",
    textDecoration: "none",
  },
  hr: { borderColor: emailColors.border, margin: "20px 0" },
  footer: { padding: "16px 4px" },
  footerText: { color: emailColors.muted, fontSize: "12px", lineHeight: "18px", margin: "0 0 6px" },
  footerLink: { color: emailColors.accent, textDecoration: "underline" },
} as const
