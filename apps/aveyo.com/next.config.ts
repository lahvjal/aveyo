import type { NextConfig } from "next";
import { loadCentralEnv } from "@ava/config/runtime/load-central-env";

loadCentralEnv();

/**
 * In local dev, platform session cookies are issued by `api` (e.g. :4002). The marketing
 * site runs on another port (:4007). Many browsers treat that cross-origin `fetch` as
 * a cross-site subrequest, so `SameSite=Lax` cookies are not attached and `/api/auth/session`
 * stays 401 even after a successful login on `auth`. Rewriting same-origin `/api/auth/*`
 * through this app lets the browser send cookies reliably; Next forwards them upstream.
 *
 * Override with `AVEYO_COM_INTERNAL_API_BASE_URL` if your API dev port differs.
 */
function authApiRewriteDestination() {
  const configured = process.env.AVEYO_COM_INTERNAL_API_BASE_URL?.trim();
  if (configured) {
    return configured.replace(/\/$/, "");
  }
  return "http://localhost:4002";
}

const nextConfig: NextConfig = {
  transpilePackages: ["@ava/auth", "@ava/widget"],
  eslint: {
    ignoreDuringBuilds: true
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn.prod.website-files.com"
      },
      {
        protocol: "https",
        hostname: "uploads-ssl.webflow.com"
      }
    ]
  },
  async rewrites() {
    if (process.env.NODE_ENV !== "development") {
      return [];
    }
    const base = authApiRewriteDestination();
    return [
      {
        source: "/api/auth/:path*",
        destination: `${base}/api/auth/:path*`
      }
    ];
  }
};

export default nextConfig;

