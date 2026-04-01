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

function roleFromClaims(claims: JwtClaims | undefined): string | undefined {
  if (!claims) {
    return undefined;
  }

  const topLevelRole =
    asString(claims.app_role) ?? asString(claims.user_role) ?? asString(claims.role);
  if (topLevelRole) {
    return topLevelRole;
  }

  const appMetadata = claims.app_metadata;
  if (appMetadata && typeof appMetadata === "object" && !Array.isArray(appMetadata)) {
    const role = asString((appMetadata as Record<string, unknown>).role);
    if (role) {
      return role;
    }
  }

  return undefined;
}

function roleFromUser(user: User): string | undefined {
  return (
    asString(user.app_metadata?.app_role) ??
    asString(user.app_metadata?.role) ??
    asString(user.user_metadata?.role)
  );
}

export function resolveRole(claims: JwtClaims | undefined, user?: User): AppRole {
  const claimRole = roleFromClaims(claims);
  const userRole = user ? roleFromUser(user) : undefined;
  return normalizeRole(claimRole ?? userRole);
}
