import { type PoolOptions } from "mysql2/promise";

function normalizeEnvValue(value: string | undefined) {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

function parsePort(value: string) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : 3306;
}

function shouldUseSsl(url: URL) {
  const rawMode = url.searchParams.get("ssl-mode") ?? url.searchParams.get("sslmode");
  const mode = rawMode?.trim().toLowerCase();
  if (!mode) {
    return false;
  }

  return mode !== "disabled" && mode !== "false" && mode !== "off";
}

export function getMySqlPoolConfig(): PoolOptions | undefined {
  const databaseUrl = normalizeEnvValue(process.env.DATABASE_URL);
  if (!databaseUrl) {
    return undefined;
  }

  const parsedUrl = new URL(databaseUrl);
  if (parsedUrl.protocol !== "mysql:") {
    throw new Error(
      `Invalid DATABASE_URL protocol "${parsedUrl.protocol}". Expected mysql:// URL.`
    );
  }

  const database = parsedUrl.pathname.replace(/^\//, "");
  if (!database) {
    throw new Error("DATABASE_URL is missing a database name.");
  }

  const config: PoolOptions = {
    host: parsedUrl.hostname,
    port: parsedUrl.port ? parsePort(parsedUrl.port) : 3306,
    user: decodeURIComponent(parsedUrl.username),
    password: decodeURIComponent(parsedUrl.password),
    database,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  };

  if (shouldUseSsl(parsedUrl)) {
    config.ssl = {
      rejectUnauthorized: false
    };
  }

  return config;
}
