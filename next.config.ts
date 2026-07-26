import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["pdf-lib"],
  serverActions: {
    bodySizeLimit: '10mb',
  },
};

export default nextConfig;
