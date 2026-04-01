import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@ava/chat-domain", "@ava/ui"]
};

export default nextConfig;
