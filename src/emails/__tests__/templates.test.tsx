/**
 * @jest-environment node
 */
import { writeFileSync } from "fs"
import { join } from "path"
import type { ReactElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { PaymentReminderEmail } from "@/emails/payment-reminder"
import { PaymentOverdueEmail } from "@/emails/payment-overdue"
import { PaymentReceivedEmail } from "@/emails/payment-received"
import { LeaseExpiringEmail } from "@/emails/lease-expiring"
import { LeaseExpiredEmail } from "@/emails/lease-expired"
import { LeaseUpdateEmail } from "@/emails/lease-update"
import { NewMessageEmail } from "@/emails/new-message"
import { MaintenanceUpdateEmail } from "@/emails/maintenance-update"
import { DepositUpdateEmail } from "@/emails/deposit-update"

// Every template rendered with realistic data: no "undefined"/"NaN", amounts in FCFA,
// dates in French, footer with the absolute link to the notification settings.
const cases: [string, ReactElement, string[]][] = [
  ["payment-reminder", <PaymentReminderEmail key="a" {...PaymentReminderEmail.PreviewProps} />, ["Loyer bientôt dû", "150 000 FCFA", "5 novembre 2026", "dans 3 jours"]],
  ["payment-reminder-new", <PaymentReminderEmail key="b" {...PaymentReminderEmail.PreviewProps} daysLeft={undefined} />, ["Nouveau loyer à régler"]],
  ["payment-overdue", <PaymentOverdueEmail key="c" {...PaymentOverdueEmail.PreviewProps} />, ["Loyer en retard", "150 000 FCFA", "5 octobre 2026"]],
  ["payment-received", <PaymentReceivedEmail key="d" {...PaymentReceivedEmail.PreviewProps} />, ["Paiement confirmé", "Mobile Money", "MM-482913"]],
  ["lease-expiring", <LeaseExpiringEmail key="e" {...LeaseExpiringEmail.PreviewProps} />, ["Fin de bail proche", "30 novembre 2026", "dans 30 jours"]],
  ["lease-expired", <LeaseExpiredEmail key="f" {...LeaseExpiredEmail.PreviewProps} />, ["Bail expiré", "30 septembre 2026"]],
  ["lease-created", <LeaseUpdateEmail key="g" {...LeaseUpdateEmail.PreviewProps} />, ["Nouveau bail", "150 000 FCFA", "1 novembre 2026"]],
  ["lease-activated", <LeaseUpdateEmail key="h" {...LeaseUpdateEmail.PreviewProps} kind="activated" />, ["Bail en vigueur"]],
  ["lease-renewed", <LeaseUpdateEmail key="i" {...LeaseUpdateEmail.PreviewProps} kind="renewed" />, ["Bail renouvelé"]],
  ["lease-terminated", <LeaseUpdateEmail key="j" {...LeaseUpdateEmail.PreviewProps} kind="terminated" reason="Départ anticipé" />, ["Bail résilié", "Départ anticipé"]],
  ["new-message", <NewMessageEmail key="k" {...NewMessageEmail.PreviewProps} />, ["Nouveau message", "Marie-Claire Ngo Bassong"]],
  ["maintenance-status", <MaintenanceUpdateEmail key="l" {...MaintenanceUpdateEmail.PreviewProps} />, ["En cours", "Villa Bonapriso"]],
  ["maintenance-comment", <MaintenanceUpdateEmail key="m" {...MaintenanceUpdateEmail.PreviewProps} kind="comment" actorName="Samuel Fotso" comment="Le plombier passe demain." />, ["Nouveau commentaire", "Le plombier passe demain."]],
  ["deposit-received", <DepositUpdateEmail key="n" kind="received" propertyName="Villa Bonapriso" amount={300000} receivedAt="2026-01-02T00:00:00.000Z" leaseUrl="http://localhost:3000/leases/demo" />, ["Caution reçue", "300 000 FCFA", "2 janvier 2026"]],
  ["deposit-settled", <DepositUpdateEmail key="o" {...DepositUpdateEmail.PreviewProps} remainingDue={20000} />, ["Caution restituée", "250 000 FCFA", "Reste dû", "20 000 FCFA"]],
]

// Narrow no-break spaces from toLocaleString are normalized for the assertions
const normalize = (html: string) => html.replace(/[  ]/g, " ").replace(/&#x27;|&#39;/g, "'")

describe("email templates", () => {
  // react-dom/server directly: @react-email's render() uses a dynamic import that Jest
  // (without --experimental-vm-modules) cannot run; the markup is the same.
  it.each(cases)("%s renders complete French content", (name, element, expected) => {
    const html = normalize(renderToStaticMarkup(element))
    const text = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ")

    expect(html).not.toMatch(/undefined|NaN|null|Invalid Date/)
    expect(text).not.toMatch(/undefined|NaN|Invalid Date/)
    for (const fragment of expected) expect(text).toContain(fragment)
    expect(html).toContain("RentalManager")
    expect(html).toContain("Vous recevez cet e-mail car")
    expect(html).toContain("/settings?tab=notifications")
    expect(html).not.toContain("$")

    // EMAIL_RENDER_DIR=/some/dir pnpm test src/emails  -> writes the HTML for a visual check
    if (process.env.EMAIL_RENDER_DIR) {
      writeFileSync(join(process.env.EMAIL_RENDER_DIR, `${name}.html`), html)
    }
  })
})
