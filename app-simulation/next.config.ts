import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  basePath: '/simulator',
  typescript: {
    ignoreBuildErrors: true,
  },
  /* config options here */
};

import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n.ts');

export default withNextIntl(nextConfig);
