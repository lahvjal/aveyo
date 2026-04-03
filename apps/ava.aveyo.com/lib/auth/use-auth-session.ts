"use client";

import { useEffect, useState } from "react";
import {
  fetchAuthSession,
  type PlatformUserType,
  type PlatformSessionPayload,
  type PlatformSessionUser
} from "./session";

export interface PlatformAuthSession {
  loading: boolean;
  authenticated: boolean;
  role: string;
  userType: PlatformUserType;
  user: PlatformSessionUser | null;
}

const defaultSession: PlatformAuthSession = {
  loading: true,
  authenticated: false,
  role: "unknown",
  userType: "unknown",
  user: null
};

const sessionPollIntervalMs = 30000;
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
const LOCAL_HOST_PATTERN =
  /^(localhost|127(?:\.\d{1,3}){3}|10(?:\.\d{1,3}){3}|172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2}|192\.168(?:\.\d{1,3}){2}|0\.0\.0\.0|::1|.+\.local)$/i;

interface AuthSessionSnapshotMessageData {
  source?: string;
  type?: string;
  payload?: unknown;
}

function normalizeEmail(value: unknown): string | null {
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

function normalizeSessionUser(value: unknown): PlatformSessionUser | null {
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
  const name =
    preferredName &&
    normalizedPreferredName !== "account" &&
    normalizedPreferredName !== "customer" &&
    normalizedPreferredName !== "user"
      ? preferredName
      : getNameFromEmail(email) || "Customer";
  const avatarUrl =
    typeof record.avatarUrl === "string"
      ? record.avatarUrl
      : record.avatarUrl === null
        ? null
        : null;

  return {
    id,
    email,
    name,
    avatarUrl
  };
}

function normalizeUserType(value: unknown): PlatformUserType | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value.trim().toLowerCase();
  if (!normalized) {
    return undefined;
  }
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

function toNormalizedRole(role: string | null | undefined) {
  return typeof role === "string" ? role.trim().toLowerCase() : "";
}

function deriveUserType(params: {
  authenticated: boolean;
  role: string | null | undefined;
  explicitUserType?: PlatformUserType;
  user: PlatformSessionUser | null;
}): PlatformUserType {
  if (!params.authenticated) {
    return "unknown";
  }

  if (params.explicitUserType && params.explicitUserType !== "unknown") {
    return params.explicitUserType;
  }

  const normalizedRole = toNormalizedRole(params.role);
  if (normalizedRole === "customer") {
    return "customer";
  }
  if (EMPLOYEE_ROLES.has(normalizedRole)) {
    return "employee";
  }

  const normalizedEmail = normalizeEmail(params.user?.email);
  if (normalizedEmail && normalizedEmail.endsWith(EMPLOYEE_EMAIL_DOMAIN)) {
    return "employee";
  }

  return "customer";
}

function normalizeSessionPayload(value: unknown): PlatformSessionPayload | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;
  if (record.authenticated !== true && record.authenticated !== false) {
    return null;
  }

  const role = typeof record.role === "string" ? record.role : undefined;
  const userType = normalizeUserType(record.userType);
  const user =
    record.user === undefined
      ? null
      : record.user === null
        ? null
        : normalizeSessionUser(record.user);

  return {
    authenticated: record.authenticated,
    role,
    userType,
    user
  };
}

function toSessionState(
  payload: PlatformSessionPayload | null | undefined,
  requestOk: boolean
): PlatformAuthSession {
  const role = payload?.role ?? "unknown";
  const user = payload?.user ?? null;

  if (!requestOk || !payload?.authenticated) {
    return {
      loading: false,
      authenticated: false,
      role,
      userType: "unknown",
      user
    };
  }

  return {
    loading: false,
    authenticated: true,
    role,
    userType: deriveUserType({
      authenticated: true,
      role,
      explicitUserType: normalizeUserType(payload.userType),
      user
    }),
    user
  };
}

function isTrustedParentOrigin(origin: string) {
  try {
    const parsed = new URL(origin);
    const host = parsed.hostname.trim().toLowerCase();
    if (!host) {
      return false;
    }
    if (host === "aveyo.com" || host.endsWith(".aveyo.com")) {
      return true;
    }
    if (host === "::1") {
      return true;
    }
    return LOCAL_HOST_PATTERN.test(host);
  } catch {
    return false;
  }
}

export function useAuthSession() {
  const [session, setSession] = useState<PlatformAuthSession>(defaultSession);

  useEffect(() => {
    let cancelled = false;

    async function loadSession() {
      try {
        const result = await fetchAuthSession();
        if (cancelled) {
          return;
        }

        setSession(toSessionState(normalizeSessionPayload(result.payload), result.ok));
      } catch {
        if (cancelled) {
          return;
        }
        setSession(toSessionState(null, false));
      }
    }

    const onMessage = (event: MessageEvent) => {
      if (!isTrustedParentOrigin(event.origin)) {
        return;
      }

      if (!event.data || typeof event.data !== "object") {
        return;
      }

      const data = event.data as AuthSessionSnapshotMessageData;
      if (data.source !== "aveyo-host" || data.type !== "auth-session-snapshot") {
        return;
      }

      const payload = normalizeSessionPayload(data.payload);
      if (!payload) {
        return;
      }

      setSession(toSessionState(payload, payload.authenticated));
    };

    const requestParentSessionSnapshot = () => {
      if (window.parent === window) {
        return;
      }
      window.parent.postMessage(
        {
          source: "ava-widget",
          type: "request-auth-session"
        },
        "*"
      );
    };

    window.addEventListener("message", onMessage);
    requestParentSessionSnapshot();

    void loadSession();
    const interval = window.setInterval(() => {
      void loadSession();
    }, sessionPollIntervalMs);

    const onFocus = () => {
      requestParentSessionSnapshot();
      void loadSession();
    };
    window.addEventListener("focus", onFocus);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("message", onMessage);
    };
  }, []);

  return session;
}
