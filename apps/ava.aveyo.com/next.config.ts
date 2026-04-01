import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@ava/chat-domain", "@ava/ui", "@ava/widget"],
  devIndicators: false
};

export default nextConfig;
