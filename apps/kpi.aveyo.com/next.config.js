const { loadCentralEnv } = require("@ava/config/runtime/load-central-env");

loadCentralEnv();

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@ava/auth", "@ava/ui"],
  images: {
    remotePatterns: [
      {
        // Supabase Storage — profile photos and other assets
        protocol: 'https',
        hostname: 'safebiayjffnkcmtshni.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
};

module.exports = nextConfig;

