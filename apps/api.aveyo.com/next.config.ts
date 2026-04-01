import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@ava/chat-domain"]
};

export default nextConfig;
