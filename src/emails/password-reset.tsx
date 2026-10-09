import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
} from "@react-email/components";

interface PasswordResetEmailProps {
  name: string;
  resetUrl: string;
}

/** Lien de réinitialisation du mot de passe (valable 1 heure, usage unique). */
export const PasswordResetEmail = ({ name, resetUrl }: PasswordResetEmailProps) => (
  <Html lang="fr">
    <Head />
    <Preview>Réinitialisez votre mot de passe RentalManager</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Réinitialisation du mot de passe</Heading>
        <Text style={text}>Bonjour {name},</Text>
        <Text style={text}>
          Vous avez demandé à réinitialiser le mot de passe de votre compte RentalManager.
          Cliquez sur le bouton ci-dessous pour en choisir un nouveau.
        </Text>
        <Button style={button} href={resetUrl}>
          Choisir un nouveau mot de passe
        </Button>
        <Text style={small}>
          Ce lien est valable 1 heure et ne peut servir qu&apos;une fois. Si vous n&apos;êtes pas
          à l&apos;origine de cette demande, ignorez cet e-mail : votre mot de passe reste inchangé.
        </Text>
        <Text style={small}>
          Le bouton ne fonctionne pas ? Copiez ce lien dans votre navigateur :
          <br />
          {resetUrl}
        </Text>
        <Text style={footer}>L&apos;équipe RentalManager</Text>
      </Container>
    </Body>
  </Html>
);

const main = {
  backgroundColor: "#f4f6f8",
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  padding: "20px 0 40px",
  borderRadius: "8px",
  maxWidth: "560px",
};

const h1 = {
  color: "#1f2933",
  fontSize: "22px",
  fontWeight: "bold",
  margin: "32px 0 16px",
  padding: "0 24px",
};

const text = {
  color: "#1f2933",
  fontSize: "16px",
  lineHeight: "26px",
  padding: "0 24px",
};

const small = {
  color: "#52606d",
  fontSize: "14px",
  lineHeight: "22px",
  padding: "0 24px",
  wordBreak: "break-all" as const,
};

const button = {
  backgroundColor: "#0f766e",
  borderRadius: "6px",
  color: "#ffffff",
  display: "block",
  fontSize: "16px",
  fontWeight: "bold",
  textAlign: "center" as const,
  textDecoration: "none",
  padding: "12px 20px",
  margin: "24px",
};

const footer = {
  color: "#7b8794",
  fontSize: "14px",
  lineHeight: "20px",
  padding: "0 24px",
  marginTop: "24px",
};

export default PasswordResetEmail;
