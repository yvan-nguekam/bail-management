import type { ReactElement } from "react"

/**
 * Le lien brut peut être journalisé côté serveur pour tester sans fournisseur
 * d'e-mail : toujours en développement, et ailleurs uniquement si
 * EMAIL_DEV_LOG=true est posé explicitement (jamais sur un vrai déploiement :
 * le lien donne accès au compte).
 */
function shouldLogLinks(): boolean {
  return process.env.NODE_ENV !== "production" || process.env.EMAIL_DEV_LOG === "true"
}

/**
 * Envoie un e-mail contenant un lien à usage unique (réinitialisation, invitation)
 * via `sendEmail`. Ne lève jamais : un échec d'envoi ne doit pas révéler
 * d'information à l'appelant ni casser le flux.
 */
export async function sendLinkEmail({
  to,
  subject,
  react,
  link,
  label,
}: {
  to: string
  subject: string
  react: ReactElement
  link: string
  label: string
}): Promise<boolean> {
  const logLink = () => {
    if (shouldLogLinks()) console.info(`[${label}] lien pour ${to} : ${link}`)
  }

  if (!process.env.RESEND_API_KEY) {
    // src/lib/email.ts instancie Resend au chargement : sans clé, on ne l'importe pas
    console.warn(`[${label}] RESEND_API_KEY absent : e-mail non envoyé`)
    logLink()
    return false
  }

  try {
    const { sendEmail } = await import("@/lib/email")
    const result = await sendEmail({ to, subject, react })
    if (!result.success) logLink()
    return result.success
  } catch (error) {
    console.error(`[${label}] échec d'envoi de l'e-mail :`, error)
    logLink()
    return false
  }
}
