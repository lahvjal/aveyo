import {
  fetchPlatformSession,
  logoutPlatformSession,
  platformAuthApiRequest,
  type PlatformDepartmentNode,
  type PlatformSessionAccess,
  type PlatformSessionPayload,
  type PlatformSessionUser,
  type PlatformUserType
} from "@ava/auth";
import { getApiBaseUrl } from "./config";

export type {
  PlatformDepartmentNode,
  PlatformSessionAccess,
  PlatformSessionPayload,
  PlatformSessionUser,
  PlatformUserType
};

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
    apiBaseUrl: resolveApiBaseUrl(),
    refreshSession: () =>
      fetchPlatformSession({
        apiBaseUrl: resolveApiBaseUrl()
      })
  });
}
