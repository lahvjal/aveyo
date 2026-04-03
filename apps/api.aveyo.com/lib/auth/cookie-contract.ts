export interface SessionCookieContract {
  domain?: string;
  sameSite: "lax";
  secure: boolean;
  httpOnly: true;
}

let cachedStrictContract: SessionCookieContract | undefined;

function readBooleanEnv(value: string | undefined, defaultValue: boolean) {
  if (value === undefined) {
    return defaultValue;
  }
  return value.toLowerCase() === "true";
}

function normalizeHostname(host: string | null): string {
  if (!host) {
    return "";
  }

  const trimmed = host.trim().toLowerCase();
  if (!trimmed) {
    return "";
  }

  const withoutPort = trimmed.startsWith("[")
    ? (trimmed.match(/^\[([^\]]+)\](?::\d+)?$/)?.[1] ?? trimmed)
    : trimmed.split(":")[0];
  return withoutPort.replace(/^\[|\]$/g, "");
}

const LOCAL_HOST_PATTERN =
  /^(localhost|127(?:\.\d{1,3}){3}|10(?:\.\d{1,3}){3}|172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2}|192\.168(?:\.\d{1,3}){2}|0\.0\.0\.0|::1|.+\.localhost|.+\.local)$/i;

function isLocalDevHost(host: string | null) {
  const hostname = normalizeHostname(host);
  return LOCAL_HOST_PATTERN.test(hostname);
}

export function getSessionCookieContract(request?: Request): SessionCookieContract {
  if (request && isLocalDevHost(request.headers.get("host"))) {
    return {
      sameSite: "lax",
      secure: false,
      httpOnly: true
    };
  }

  if (cachedStrictContract) {
    return cachedStrictContract;
  }

  const domain = process.env.AVA_SESSION_COOKIE_DOMAIN ?? ".aveyo.com";
  const sameSiteRaw = (process.env.AVA_SESSION_COOKIE_SAMESITE ?? "lax").toLowerCase();
  const secure = readBooleanEnv(process.env.AVA_SESSION_COOKIE_SECURE, true);
  const httpOnly = readBooleanEnv(process.env.AVA_SESSION_COOKIE_HTTPONLY, true);

  if (domain !== ".aveyo.com") {
    throw new Error("AVA_SESSION_COOKIE_DOMAIN must be set to .aveyo.com.");
  }
  if (sameSiteRaw !== "lax") {
    throw new Error("AVA_SESSION_COOKIE_SAMESITE must be set to lax.");
  }
  if (!secure) {
    throw new Error("AVA_SESSION_COOKIE_SECURE must be true.");
  }
  if (!httpOnly) {
    throw new Error("AVA_SESSION_COOKIE_HTTPONLY must be true.");
  }

  cachedStrictContract = {
    domain,
    sameSite: "lax",
    secure,
    httpOnly: true
  };
  return cachedStrictContract;
}
