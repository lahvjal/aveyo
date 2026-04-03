import { loadCentralEnv } from "@ava/config/runtime/load-central-env";

loadCentralEnv();

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@ava/ui"]
};

export default nextConfig;
