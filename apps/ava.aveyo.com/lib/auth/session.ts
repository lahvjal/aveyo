import {
  fetchPlatformSession,
  logoutPlatformSession,
  platformAuthApiRequest,
  type PlatformSessionAccess as PlatformAccessContext,
  type PlatformDepartmentNode,
  type PlatformSessionPayload,
  type PlatformSessionUser,
  type PlatformUserType
} from "@ava/auth";
import { getApiBaseUrl } from "./config";

export type {
  PlatformAccessContext,
  PlatformDepartmentNode,
  PlatformSessionPayload,
  PlatformSessionUser,
  PlatformUserType
};

const SESSION_PATH = "/api/auth/session";
const LOGOUT_PATH = "/api/auth/session/logout";

function resolveApiBaseUrl() {
  return getApiBaseUrl();
}

export async function fetchAuthSession() {
  return fetchPlatformSession({
    apiBaseUrl: resolveApiBaseUrl(),
    sessionUrl: `${resolveApiBaseUrl()}${SESSION_PATH}`
  });
}

export async function logoutAuthSession() {
  return logoutPlatformSession({
    apiBaseUrl: resolveApiBaseUrl(),
    logoutUrl: `${resolveApiBaseUrl()}${LOGOUT_PATH}`
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
