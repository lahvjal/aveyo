import { resolveAppUrl, resolveEnvironment } from "@ava/config/runtime/app-urls";
import { resolveApiBaseUrl } from "@ava/config/runtime/auth-urls";
import type { HostSessionSnapshot, HostSessionUser, HostUserType } from "./types";

const EMPLOYEE_EMAIL_DOMAIN = "@aveyo.com";
const EMPLOYEE_ROLES = new Set([
  "support_agent",
  "support-agent",
  "support",
  "agent",
  "rep",
  "representative",
  "admin",
  "super_admin",
  "super-admin",
  "superadmin",
  "employee",
  "staff",
  "internal"
]);

function readPublicEnv(name: string): string | undefined {
  const processLike = globalThis as unknown as {
    process?: {
      env?: Record<string, string | undefined>;
    };
  };
  return processLike.process?.env?.[name];
}

export function normalizeEmail(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim().toLowerCase();
  return trimmed || null;
}

function getNameFromEmail(email: string | null): string | null {
  if (!email) {
    return null;
  }

  const localPart = email.split("@")[0]?.trim();
  return localPart || null;
}

function normalizeUserType(value: unknown): HostUserType | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value.trim().toLowerCase();
  if (normalized === "employee") {
    return "employee";
  }
  if (normalized === "customer") {
    return "customer";
  }
  if (normalized === "unknown") {
    return "unknown";
  }
  return undefined;
}

function deriveHostUserType(params: {
  authenticated: boolean;
  role: string;
  explicitUserType?: HostUserType;
  user: HostSessionUser | null;
}): HostUserType {
  if (!params.authenticated) {
    return "unknown";
  }

  if (params.explicitUserType && params.explicitUserType !== "unknown") {
    return params.explicitUserType;
  }

  const normalizedRole = params.role.trim().toLowerCase();
  if (normalizedRole === "customer") {
    return "customer";
  }
  if (EMPLOYEE_ROLES.has(normalizedRole)) {
    return "employee";
  }

  const email = normalizeEmail(params.user?.email);
  if (email && email.endsWith(EMPLOYEE_EMAIL_DOMAIN)) {
    return "employee";
  }

  return "customer";
}

function normalizeHostSessionUser(value: unknown): HostSessionUser | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;
  const id = typeof record.id === "string" ? record.id.trim() : "";
  if (!id) {
    return null;
  }

  const email = normalizeEmail(record.email);
  const preferredName = typeof record.name === "string" ? record.name.trim() : "";
  const normalizedPreferredName = preferredName.toLowerCase();

  return {
    id,
    email,
    name:
      preferredName &&
      normalizedPreferredName !== "account" &&
      normalizedPreferredName !== "customer" &&
      normalizedPreferredName !== "user"
        ? preferredName
        : getNameFromEmail(email) || "Customer",
    avatarUrl: typeof record.avatarUrl === "string" ? record.avatarUrl : null
  };
}

export function normalizeHostSessionSnapshot(value: unknown): HostSessionSnapshot | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;
  if (record.authenticated !== true && record.authenticated !== false) {
    return null;
  }

  const role = typeof record.role === "string" ? record.role : "unknown";
  const user =
    record.user === undefined || record.user === null
      ? null
      : normalizeHostSessionUser(record.user);
  const explicitUserType = normalizeUserType(record.userType);

  return {
    authenticated: record.authenticated,
    role,
    userType: deriveHostUserType({
      authenticated: record.authenticated,
      role,
      explicitUserType,
      user
    }),
    user
  };
}

export function createSignedOutSnapshot(): HostSessionSnapshot {
  return {
    authenticated: false,
    role: "unknown",
    userType: "unknown",
    user: null
  };
}

export function resolveDefaultWidgetUrl() {
  if (typeof window === "undefined") {
    return "https://ava.aveyo.com/embed";
  }

  const environment = resolveEnvironment(window.location.hostname);
  return resolveAppUrl("widget", environment) || "https://ava.aveyo.com/embed";
}

export function resolveDefaultApiBaseUrl() {
  const configuredPlatformApiBaseUrl = readPublicEnv("NEXT_PUBLIC_PLATFORM_API_BASE_URL");
  const configuredAvaApiBaseUrl = readPublicEnv("NEXT_PUBLIC_AVA_API_BASE_URL");

  if (typeof window === "undefined") {
    return resolveApiBaseUrl({
      configuredPlatformApiBaseUrl,
      configuredAvaApiBaseUrl,
      fallbackApiBaseUrl: "https://api.aveyo.com"
    });
  }

  const environment = resolveEnvironment(window.location.hostname);
  const fallbackApiBaseUrl = resolveAppUrl("api", environment) || "https://api.aveyo.com";
  return resolveApiBaseUrl({
    configuredPlatformApiBaseUrl,
    configuredAvaApiBaseUrl,
    fallbackApiBaseUrl
  });
}
