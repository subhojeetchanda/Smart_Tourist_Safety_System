import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    const simulatorUrl = process.env.SIMULATOR_URL || 'http://localhost:3001';
    return [
      {
        source: '/simulator',
        destination: simulatorUrl + '/simulator',
      },
      {
        source: '/simulator/:path*',
        destination: simulatorUrl + '/simulator/:path*',
      },
    ];
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  /* config options here */
};

import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n.ts');

export default withNextIntl(nextConfig);
