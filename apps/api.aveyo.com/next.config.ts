import type { NextConfig } from "next";
import { loadCentralEnv } from "@ava/config/runtime/load-central-env";

loadCentralEnv();

const nextConfig: NextConfig = {
  transpilePackages: ["@ava/chat-domain"]
};

export default nextConfig;
