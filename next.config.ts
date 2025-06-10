import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Disable SWC file system cache to prevent Windows permission issues
  swcMinify: true,
  webpack: (config, { dev, isServer }) => {
    // Fix for Windows file system issues
    if (dev && !isServer) {
      config.watchOptions = {
        poll: 1000,
        aggregateTimeout: 300,
      };
    }
    return config;
  },
};

export default nextConfig;
