import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable large file uploads (up to 5GB)
  experimental: {
    serverActions: {
      bodySizeLimit: '5gb',
    },
  },
};

export default nextConfig;
