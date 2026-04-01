import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@ava/widget"],
  eslint: {
    ignoreDuringBuilds: true
  }
};

export default nextConfig;

