import type { ReactElement } from "react";
import { Resend } from "resend";
import { render } from "@react-email/components";

const DEFAULT_FROM = "RentalManager <onboarding@resend.dev>";

// Client créé à la demande : sans RESEND_API_KEY, l'import du module ne doit rien casser
let client: Resend | null = null;

function getClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  client ??= new Resend(apiKey);
  return client;
}

export type SendEmailParams = {
  to: string | string[];
  subject: string;
  react: ReactElement;
  /** Version texte (générée à partir du template si absente) */
  text?: string;
  replyTo?: string | string[];
};

export type SendEmailResult =
  | { success: true; data: unknown }
  | { success: false; error?: unknown; skipped?: boolean };

/**
 * Envoie un e-mail via Resend. Ne lève jamais d'exception : le résultat indique
 * le succès, l'échec (`error`) ou l'absence de configuration (`skipped`).
 */
export async function sendEmail({
  to,
  subject,
  react,
  text,
  replyTo,
}: SendEmailParams): Promise<SendEmailResult> {
  try {
    const resend = getClient();

    if (!resend) {
      // Pas de clé : l'e-mail est seulement journalisé (hors production) pour le développement
      if (process.env.NODE_ENV !== "production") {
        const preview = text ?? (await render(react, { plainText: true }));
        console.info(
          `[email] RESEND_API_KEY absente, e-mail non envoyé\n  À : ${[to].flat().join(", ")}\n  Objet : ${subject}\n${preview
            .trim()
            .replace(/\n{3,}/g, "\n\n")
            .slice(0, 1200)
            .replace(/^/gm, "  | ")}`
        );
      } else {
        console.warn(`[email] RESEND_API_KEY absente, e-mail « ${subject} » non envoyé`);
      }
      return { success: false, skipped: true };
    }

    const { data, error } = await resend.emails.send({
      from: process.env.EMAIL_FROM || DEFAULT_FROM,
      to,
      subject,
      react,
      ...(text ? { text } : {}),
      ...(replyTo ? { replyTo } : {}),
    });

    if (error) {
      console.error("Email error:", error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (error) {
    console.error("Email error:", error);
    return { success: false, error };
  }
}
