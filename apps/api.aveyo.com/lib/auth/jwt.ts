import { type User } from "@supabase/supabase-js";
import { type AppRole } from "./types";

type JwtClaims = Record<string, unknown>;

function base64UrlDecode(value: string): string {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);

  if (typeof atob === "function") {
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  }

  if (typeof Buffer !== "undefined") {
    return Buffer.from(padded, "base64").toString("utf-8");
  }

  throw new Error("Unable to decode JWT payload.");
}

export function decodeJwtClaims(token: string): JwtClaims | undefined {
  const parts = token.split(".");
  if (parts.length < 2) {
    return undefined;
  }

  try {
    const payload = base64UrlDecode(parts[1] ?? "");
    const parsed = JSON.parse(payload) as JwtClaims;
    return parsed;
  } catch {
    return undefined;
  }
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function normalizeRole(rawRole: string | undefined): AppRole {
  if (!rawRole) {
    return "unknown";
  }

  const normalized = rawRole.toLowerCase();
  if (
    normalized === "super_admin" ||
    normalized === "super-admin" ||
    normalized === "superadmin"
  ) {
    return "super_admin";
  }

  if (
    normalized === "support_agent" ||
    normalized === "support-agent" ||
    normalized === "support" ||
    normalized === "agent" ||
    normalized === "rep" ||
    normalized === "representative" ||
    normalized === "admin"
  ) {
    return "support_agent";
  }
  if (normalized === "customer") {
    return "customer";
  }

  return "unknown";
}

function firstRecognizedRole(candidates: Array<string | undefined>): string | undefined {
  for (const candidate of candidates) {
    if (normalizeRole(candidate) !== "unknown") {
      return candidate;
    }
  }

  return undefined;
}

function roleFromClaims(claims: JwtClaims | undefined): string | undefined {
  if (!claims) {
    return undefined;
  }

  const topLevelRole = firstRecognizedRole([
    asString(claims.app_role),
    asString(claims.user_role),
    asString(claims.role)
  ]);
  if (topLevelRole) {
    return topLevelRole;
  }

  const appMetadata = claims.app_metadata;
  if (appMetadata && typeof appMetadata === "object" && !Array.isArray(appMetadata)) {
    const appMetadataRecord = appMetadata as Record<string, unknown>;
    const role = firstRecognizedRole([
      asString(appMetadataRecord.app_role),
      asString(appMetadataRecord.role),
      asString(appMetadataRecord.user_type),
      asString(appMetadataRecord.account_type)
    ]);
    if (role) {
      return role;
    }
  }

  const userMetadata = claims.user_metadata;
  if (userMetadata && typeof userMetadata === "object" && !Array.isArray(userMetadata)) {
    const userMetadataRecord = userMetadata as Record<string, unknown>;
    const role = firstRecognizedRole([
      asString(userMetadataRecord.role),
      asString(userMetadataRecord.user_type),
      asString(userMetadataRecord.account_type)
    ]);
    if (role) {
      return role;
    }
  }

  return undefined;
}

function roleFromUser(user: User): string | undefined {
  return firstRecognizedRole([
    asString(user.app_metadata?.app_role),
    asString(user.app_metadata?.role),
    asString(user.app_metadata?.user_type),
    asString(user.app_metadata?.account_type),
    asString(user.user_metadata?.role),
    asString(user.user_metadata?.user_type),
    asString(user.user_metadata?.account_type)
  ]);
}

export function resolveRole(claims: JwtClaims | undefined, user?: User): AppRole {
  const claimRole = normalizeRole(roleFromClaims(claims));
  if (claimRole !== "unknown") {
    return claimRole;
  }

  const userRole = normalizeRole(user ? roleFromUser(user) : undefined);
  return userRole;
}
