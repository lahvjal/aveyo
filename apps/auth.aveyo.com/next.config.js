const os = require("node:os");
const { loadCentralEnv } = require("@ava/config/runtime/load-central-env");

loadCentralEnv();

function readConfiguredOrigins() {
  const raw =
    process.env.NEXT_ALLOWED_DEV_ORIGINS ||
    process.env.ALLOWED_DEV_ORIGINS ||
    process.env.NEXT_PUBLIC_LOCAL_NETWORK_HOST ||
    "";

  return raw
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

function readLocalInterfaceHosts() {
  const networkInterfaces = os.networkInterfaces();
  const hosts = new Set(["localhost", "127.0.0.1", "0.0.0.0", "::1"]);

  for (const addresses of Object.values(networkInterfaces)) {
    for (const address of addresses ?? []) {
      if (!address || address.internal) {
        continue;
      }

      if (address.family === "IPv4" || address.family === 4) {
        hosts.add(address.address);
      }
    }
  }

  return Array.from(hosts);
}

/** @type {import("next").NextConfig} */
const nextConfig = {
  transpilePackages: ["@ava/ui"],
  allowedDevOrigins: Array.from(
    new Set([...readLocalInterfaceHosts(), ...readConfiguredOrigins()])
  )
};

module.exports = nextConfig;
