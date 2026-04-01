import { getApiBaseUrl } from "./config";

export type PlatformUserType = "employee" | "customer" | "unknown";

export interface PlatformSessionUser {
  id: string;
  email: string | null;
  name: string;
  avatarUrl: string | null;
}

export interface PlatformSessionPayload {
  authenticated: boolean;
  role?: string;
  userType?: PlatformUserType | string;
  user?: PlatformSessionUser | null;
}

const apiBaseUrl = getApiBaseUrl();

function readErrorMessage(payload: unknown) {
  if (payload && typeof payload === "object" && "error" in payload) {
    const value = (payload as Record<string, unknown>).error;
    if (typeof value === "string" && value.trim()) {
      return value;
    }
  }
  return undefined;
}

export async function fetchAuthSession() {
  const response = await fetch(`${apiBaseUrl}/api/auth/session`, {
    method: "GET",
    credentials: "include",
    cache: "no-store"
  });

  const payload = (await response.json().catch(() => null)) as PlatformSessionPayload | null;
  return {
    ok: response.ok,
    status: response.status,
    payload
  };
}

export async function logoutAuthSession() {
  await fetch(`${apiBaseUrl}/api/auth/session/logout`, {
    method: "POST",
    credentials: "include"
  }).catch(() => null);
}

export async function authApiRequest<T>(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  if (!headers.has("Content-Type") && init.method && init.method !== "GET") {
    headers.set("Content-Type", "application/json");
  }

  const requestUrl = `${apiBaseUrl}${path}`;
  const runFetch = async () => {
    try {
      return await fetch(requestUrl, {
        ...init,
        headers,
        credentials: "include"
      });
    } catch (error) {
      throw new Error(
        error instanceof Error && error.message
          ? `Unable to reach API for ${init.method ?? "GET"} ${path}: ${error.message}`
          : `Unable to reach API for ${init.method ?? "GET"} ${path}.`
      );
    }
  };

  let response = await runFetch();

  if (response.status === 401) {
    await fetchAuthSession().catch(() => null);
    response = await runFetch();
  }

  const payload = (await response.json().catch(() => null)) as unknown;
  if (!response.ok) {
    throw new Error(
      readErrorMessage(payload) ??
        `API request failed (${response.status}) for ${init.method ?? "GET"} ${path}.`
    );
  }

  return payload as T;
}
