import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/simulator',
        destination: process.env.SIMULATOR_URL + '/simulator',
      },
      {
        source: '/simulator/:path*',
        destination: process.env.SIMULATOR_URL + '/simulator/:path*',
      },
    ];
  },
  /* config options here */
};

export default nextConfig;
