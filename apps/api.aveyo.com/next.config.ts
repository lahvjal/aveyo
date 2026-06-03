import type { NextConfig } from "next";
import { loadCentralEnv } from "@ava/config/runtime/load-central-env";

loadCentralEnv();

const nextConfig: NextConfig = {
  transpilePackages: ["@ava/chat-domain", "@ava/ui"],
  experimental: {
    // Culture event poster uploads can include multiple 10MB images in one request.
    proxyClientMaxBodySize: "50mb",
    serverActions: {
      bodySizeLimit: "50mb"
    }
  }
};

export default nextConfig;
