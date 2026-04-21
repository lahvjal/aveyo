import { loadCentralEnv } from "@ava/config/runtime/load-central-env";

loadCentralEnv();

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@ava/auth", "@ava/ui"]
};

export default nextConfig;
