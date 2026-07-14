import type { NextConfig } from "next";

const backendPort = process.env.DEVHUB_BACKEND_PORT || process.env.BACKEND_PORT || "8001";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `http://localhost:${backendPort}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
