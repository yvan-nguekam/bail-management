import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

// Utilise ./src/i18n/request.ts par défaut
const withNextIntl = createNextIntlPlugin();

const nextConfig: NextConfig = {
  /* config options here */
};

export default withNextIntl(nextConfig);
