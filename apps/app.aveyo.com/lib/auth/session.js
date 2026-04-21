import {
  fetchPlatformSession,
  logoutPlatformSession,
  platformAuthApiRequest
} from "@ava/auth";
import { getApiBaseUrl } from "./config";

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

export async function authApiRequest(path, init = {}) {
  return platformAuthApiRequest(path, init, {
    apiBaseUrl: resolveApiBaseUrl(),
    refreshSession: () => fetchPlatformSession({ apiBaseUrl: resolveApiBaseUrl() })
  });
}
