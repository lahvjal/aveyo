import {
  fetchPlatformSession,
  logoutPlatformSession,
  platformAuthApiRequest,
  type PlatformSessionPayload,
  type PlatformSessionUser
} from "@ava/auth";
import { getApiBaseUrl } from "./config";

export type { PlatformSessionPayload, PlatformSessionUser };

function resolveApiBaseUrl() {
  return getApiBaseUrl();
}

export async function fetchAuthSession() {
  return fetchPlatformSession({
    apiBaseUrl: resolveApiBaseUrl()
  });
}

export async function logoutAuthSession() {
  return logoutPlatformSession({
    apiBaseUrl: resolveApiBaseUrl()
  });
}

export async function authApiRequest<T>(path: string, init: RequestInit = {}) {
  return platformAuthApiRequest<T>(path, init, {
    refreshSession: () =>
      fetchPlatformSession({
        apiBaseUrl: resolveApiBaseUrl()
      })
  });
}
