import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  basePath: '/simulator',
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  /* config options here */
};

export default nextConfig;
