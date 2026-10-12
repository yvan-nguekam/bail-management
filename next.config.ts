import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

// Utilise ./src/i18n/request.ts par défaut
const withNextIntl = createNextIntlPlugin();

// En-têtes de sécurité appliqués à toutes les réponses.
// CSP : seules les directives qui ne touchent ni aux scripts ni aux styles sont posées
// (anti-clickjacking, base/form/object). Une politique script-src/style-src stricte
// demanderait des nonces (scripts inline de Next et de next-themes, styles inline de
// Recharts) : à traiter séparément.
const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  {
    key: "Content-Security-Policy",
    value: "frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'",
  },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()",
  },
  ...(process.env.NODE_ENV === "production"
    ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" }]
    : []),
];

const nextConfig: NextConfig = {
  env: {
    // Envoi de fichiers (Uploadthing) : activé côté client si UPLOADTHING_TOKEN est présent au
    // build, sauf valeur explicite de NEXT_PUBLIC_UPLOAD_ENABLED ("true" / "false").
    NEXT_PUBLIC_UPLOAD_ENABLED:
      process.env.NEXT_PUBLIC_UPLOAD_ENABLED ?? (process.env.UPLOADTHING_TOKEN ? "true" : "false"),
  },
};

export default withNextIntl(nextConfig);
