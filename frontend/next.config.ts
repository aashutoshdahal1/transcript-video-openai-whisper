import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow up to 500MB uploads through the Next.js middleware layer
  experimental: {
    middlewareClientMaxBodySize: 500 * 1024 * 1024,
  },
};

export default nextConfig;
