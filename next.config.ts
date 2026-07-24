import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // @ts-ignore - Next.js typing might not have this yet
  allowedDevOrigins: ["192.168.0.13", "localhost"],
};

export default nextConfig;
