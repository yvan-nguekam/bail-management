import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
  Section,
  Button,
} from "@react-email/components";

interface PaymentReminderEmailProps {
  tenantName: string;
  propertyName: string;
  amount: number;
  dueDate: string;
  paymentUrl: string;
}

export const PaymentReminderEmail = ({
  tenantName,
  propertyName,
  amount,
  dueDate,
  paymentUrl,
}: PaymentReminderEmailProps) => (
  <Html>
    <Head />
    <Preview>Rappel de paiement - {propertyName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Rappel de Paiement</Heading>
        <Text style={text}>Bonjour {tenantName},</Text>
        <Text style={text}>
          Ceci est un rappel concernant votre paiement de loyer pour{" "}
          <strong>{propertyName}</strong>.
        </Text>
        <Section style={box}>
          <Text style={boxText}>
            <strong>Montant:</strong> {amount.toLocaleString()} FCFA
          </Text>
          <Text style={boxText}>
            <strong>Date d'échéance:</strong> {dueDate}
          </Text>
        </Section>
        <Button style={button} href={paymentUrl}>
          Voir le paiement
        </Button>
        <Text style={footer}>
          Merci de votre confiance,
          <br />
          L'équipe RentalManager
        </Text>
      </Container>
    </Body>
  </Html>
);

const main = {
  backgroundColor: "#f6f9fc",
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  padding: "20px 0 48px",
  marginBottom: "64px",
  borderRadius: "5px",
};

const h1 = {
  color: "#333",
  fontSize: "24px",
  fontWeight: "bold",
  margin: "40px 0",
  padding: "0 24px",
};

const text = {
  color: "#333",
  fontSize: "16px",
  lineHeight: "26px",
  padding: "0 24px",
};

const box = {
  backgroundColor: "#f4f4f4",
  borderRadius: "4px",
  margin: "24px",
  padding: "24px",
};

const boxText = {
  color: "#333",
  fontSize: "16px",
  lineHeight: "24px",
  margin: "8px 0",
};

const button = {
  backgroundColor: "#007bff",
  borderRadius: "5px",
  color: "#fff",
  display: "block",
  fontSize: "16px",
  fontWeight: "bold",
  textAlign: "center" as const,
  textDecoration: "none",
  width: "200px",
  padding: "12px",
  margin: "24px auto",
};

const footer = {
  color: "#8898aa",
  fontSize: "14px",
  lineHeight: "20px",
  padding: "0 24px",
  marginTop: "32px",
};

export default PaymentReminderEmail;
