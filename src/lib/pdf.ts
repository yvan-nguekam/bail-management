import jsPDF from "jspdf";

export function generatePaymentReceipt(payment: {
  id: string;
  amount: number;
  paidDate: Date;
  paymentMethod: string;
  lease: {
    property: { name: string; address: string };
    tenant: { name: string };
  };
}) {
  const doc = new jsPDF();

  // Header
  doc.setFontSize(20);
  doc.text("REÇU DE PAIEMENT", 105, 20, { align: "center" });

  // Info receipt
  doc.setFontSize(10);
  doc.text(`N° ${payment.id.slice(0, 8)}`, 20, 40);
  doc.text(
    `Date: ${new Date(payment.paidDate).toLocaleDateString("fr-FR")}`,
    20,
    45
  );

  // Property & Tenant
  doc.setFontSize(12);
  doc.text("Locataire:", 20, 60);
  doc.setFontSize(10);
  doc.text(payment.lease.tenant.name, 20, 65);

  doc.setFontSize(12);
  doc.text("Propriété:", 20, 75);
  doc.setFontSize(10);
  doc.text(payment.lease.property.name, 20, 80);
  doc.text(payment.lease.property.address, 20, 85);

  // Payment details
  doc.setFontSize(12);
  doc.text("Détails du paiement:", 20, 100);
  doc.setFontSize(10);
  doc.text(`Montant: ${payment.amount.toLocaleString()} FCFA`, 20, 105);
  doc.text(`Méthode: ${payment.paymentMethod}`, 20, 110);

  // Footer
  doc.setFontSize(8);
  doc.text("RentalManager - Système de gestion locative", 105, 280, {
    align: "center",
  });

  return doc;
}

export function downloadPaymentReceipt(payment: any) {
  const doc = generatePaymentReceipt(payment);
  doc.save(`recu-${payment.id.slice(0, 8)}.pdf`);
}
