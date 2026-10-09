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

interface TenantInvitationEmailProps {
  name: string;
  inviterName: string;
  acceptUrl: string;
}

/** Invitation d'un locataire à créer son compte (lien valable 7 jours). */
export const TenantInvitationEmail = ({
  name,
  inviterName,
  acceptUrl,
}: TenantInvitationEmailProps) => (
  <Html lang="fr">
    <Head />
    <Preview>{`${inviterName} vous invite sur RentalManager`}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Vous êtes invité sur RentalManager</Heading>
        <Text style={text}>Bonjour {name},</Text>
        <Text style={text}>
          <strong>{inviterName}</strong> vous invite à créer votre compte locataire sur
          RentalManager pour suivre votre bail, vos loyers et vos demandes d&apos;intervention.
        </Text>
        <Button style={button} href={acceptUrl}>
          Créer mon compte
        </Button>
        <Text style={small}>
          Cette invitation est valable 7 jours. Si vous ne connaissez pas l&apos;expéditeur,
          ignorez simplement cet e-mail.
        </Text>
        <Text style={small}>
          Le bouton ne fonctionne pas ? Copiez ce lien dans votre navigateur :
          <br />
          {acceptUrl}
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

export default TenantInvitationEmail;
