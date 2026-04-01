import { getPlatformApiBaseUrl } from "./config";

export interface PlatformSessionUser {
  id: string;
  email: string | null;
  name: string;
  avatarUrl: string | null;
}

export interface PlatformSessionPayload {
  authenticated: boolean;
  role?: string;
  user?: PlatformSessionUser | null;
}

const platformApiBaseUrl = getPlatformApiBaseUrl();

export async function fetchPlatformAuthSession() {
  const response = await fetch(`${platformApiBaseUrl}/api/auth/session`, {
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
