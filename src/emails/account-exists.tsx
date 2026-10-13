import { Text } from "@react-email/components"
import { EmailLayout } from "./_components/email-layout"
import { absoluteUrl } from "../lib/notification-preferences"

interface AccountExistsEmailProps {
  name: string
}

/**
 * Envoyé quand quelqu'un tente de s'inscrire avec une adresse déjà utilisée :
 * l'inscription répond de façon neutre, le vrai titulaire est prévenu ici.
 */
export function AccountExistsEmail({ name }: AccountExistsEmailProps) {
  return (
    <EmailLayout
      preview="Une inscription a été tentée avec votre adresse e-mail"
      heading="Vous avez déjà un compte"
      recipientName={name}
      action={{ label: "Se connecter", href: absoluteUrl("/auth/login") }}
      reason="une inscription a été tentée avec cette adresse"
    >
      <Text>
        Quelqu&apos;un vient d&apos;essayer de créer un compte RentalManager avec votre adresse
        e-mail. Comme un compte existe déjà, aucun nouveau compte n&apos;a été créé.
      </Text>
      <Text>
        Si c&apos;était vous, connectez-vous avec votre mot de passe habituel, ou utilisez
        « Mot de passe oublié » pour en choisir un nouveau : {absoluteUrl("/auth/forgot-password")}
      </Text>
      <Text>Si ce n&apos;était pas vous, vous pouvez ignorer cet e-mail : votre compte n&apos;a pas été modifié.</Text>
    </EmailLayout>
  )
}

export default AccountExistsEmail
