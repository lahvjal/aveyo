"use client";

import { useEffect, useState } from "react";
import {
  fetchAuthSession,
  type PlatformDepartmentNode,
  type PlatformSessionAccess,
  type PlatformSessionUser,
  type PlatformUserType
} from "./session";

const defaultAccess: PlatformSessionAccess = {
  userType: "unknown",
  departmentId: null,
  departmentName: null,
  departmentPath: [],
  subDepartments: [],
  subDepartmentIds: [],
  isManager: false,
  isAdmin: false,
  isExecutive: false,
  isSuperAdmin: false
};

function normalizeDepartmentNodes(value: unknown): PlatformDepartmentNode[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((entry): entry is Record<string, unknown> => Boolean(entry && typeof entry === "object"))
    .map((entry) => ({
      id: typeof entry.id === "string" ? entry.id : "",
      name: typeof entry.name === "string" ? entry.name : "",
      parentId: typeof entry.parentId === "string" ? entry.parentId : null
    }))
    .filter((entry) => entry.id && entry.name);
}

function normalizeAccess(value: unknown): PlatformSessionAccess {
  if (!value || typeof value !== "object") {
    return defaultAccess;
  }

  const record = value as Record<string, unknown>;
  const rawUserType = record.userType;
  const userType: PlatformUserType =
    rawUserType === "employee" || rawUserType === "customer" ? rawUserType : "unknown";

  return {
    userType,
    departmentId: typeof record.departmentId === "string" ? record.departmentId : null,
    departmentName: typeof record.departmentName === "string" ? record.departmentName : null,
    departmentPath: normalizeDepartmentNodes(record.departmentPath),
    subDepartments: normalizeDepartmentNodes(record.subDepartments),
    subDepartmentIds: Array.isArray(record.subDepartmentIds)
      ? record.subDepartmentIds.filter((entry): entry is string => typeof entry === "string")
      : [],
    isManager: Boolean(record.isManager),
    isAdmin: Boolean(record.isAdmin),
    isExecutive: Boolean(record.isExecutive),
    isSuperAdmin: Boolean(record.isSuperAdmin)
  };
}

export interface PlatformAuthSession {
  loading: boolean;
  authenticated: boolean;
  role: string;
  userType: PlatformUserType;
  access: PlatformSessionAccess;
  user: PlatformSessionUser | null;
}

const defaultSession: PlatformAuthSession = {
  loading: true,
  authenticated: false,
  role: "unknown",
  userType: "unknown",
  access: defaultAccess,
  user: null
};

const sessionPollIntervalMs = 30000;

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

        if (!result.ok || !result.payload?.authenticated) {
          setSession({
            loading: false,
            authenticated: false,
            role: result.payload?.role ?? "unknown",
            userType: result.payload?.userType ?? "unknown",
            access: normalizeAccess(result.payload?.access),
            user: result.payload?.user ?? null
          });
          return;
        }

        setSession({
          loading: false,
          authenticated: true,
          role: result.payload.role ?? "unknown",
          userType: result.payload.userType ?? "unknown",
          access: normalizeAccess(result.payload.access),
          user: result.payload.user ?? null
        });
      } catch {
        if (cancelled) {
          return;
        }

        setSession({
          loading: false,
          authenticated: false,
          role: "unknown",
          userType: "unknown",
          access: defaultAccess,
          user: null
        });
      }
    }

    void loadSession();
    const interval = window.setInterval(() => {
      void loadSession();
    }, sessionPollIntervalMs);

    const onFocus = () => {
      void loadSession();
    };
    window.addEventListener("focus", onFocus);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  return session;
}
