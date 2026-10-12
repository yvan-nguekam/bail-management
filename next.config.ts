import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

// Utilise ./src/i18n/request.ts par défaut
const withNextIntl = createNextIntlPlugin();

const nextConfig: NextConfig = {
  env: {
    // Envoi de fichiers (Uploadthing) : activé côté client si UPLOADTHING_TOKEN est présent au
    // build, sauf valeur explicite de NEXT_PUBLIC_UPLOAD_ENABLED ("true" / "false").
    NEXT_PUBLIC_UPLOAD_ENABLED:
      process.env.NEXT_PUBLIC_UPLOAD_ENABLED ?? (process.env.UPLOADTHING_TOKEN ? "true" : "false"),
  },
};

export default withNextIntl(nextConfig);
