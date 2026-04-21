import type { NextConfig } from "next";
import { loadCentralEnv } from "@ava/config/runtime/load-central-env";

loadCentralEnv();

const nextConfig: NextConfig = {
  transpilePackages: ["@ava/auth", "@ava/chat-domain", "@ava/ui", "@ava/widget"],
  devIndicators: false
};

export default nextConfig;
