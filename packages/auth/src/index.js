import {
  buildAuthLoginUrl as buildSharedAuthLoginUrl,
  resolveApiBaseUrl,
  resolveAuthAppUrl,
  resolvePlatformAppUrl
} from "@ava/config/runtime/auth-urls";
import { resolveAppUrl, resolveEnvironment, trimTrailingSlash } from "@ava/config/runtime/app-urls";

const DEFAULT_SESSION_PATH = "/api/auth/session";
const DEFAULT_LOGOUT_PATH = "/api/auth/session/logout";
const DEFAULT_POLL_INTERVAL_MS = 30000;
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

export const DEFAULT_PLATFORM_SESSION_ACCESS = Object.freeze({
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
});

function getRuntimeWindow(explicitWindow) {
  if (explicitWindow) {
    return explicitWindow;
  }
  if (typeof window === "undefined") {
    return null;
  }
  return window;
}

function toNormalizedRole(value) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function normalizeEmail(value) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim().toLowerCase();
  return trimmed || null;
}

function getNameFromEmail(email) {
  if (!email) {
    return null;
  }

  const localPart = email.split("@")[0]?.trim();
  return localPart || null;
}

function normalizeName(value, email) {
  const preferredName = typeof value === "string" ? value.trim() : "";
  const normalizedPreferredName = preferredName.toLowerCase();
  if (
    preferredName &&
    normalizedPreferredName !== "account" &&
    normalizedPreferredName !== "customer" &&
    normalizedPreferredName !== "user"
  ) {
    return preferredName;
  }

  return getNameFromEmail(email) || "Customer";
}

function normalizePlatformSessionFailure(value) {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  const record = value;
  const reason = typeof record.reason === "string" ? record.reason.trim() : "";
  if (!reason) {
    return undefined;
  }

  return {
    reason,
    expectedProjectRef:
      typeof record.expectedProjectRef === "string" ? record.expectedProjectRef : null,
    actualProjectRef: typeof record.actualProjectRef === "string" ? record.actualProjectRef : null
  };
}

export function normalizePlatformSessionUser(value) {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value;
  const id = typeof record.id === "string" ? record.id.trim() : "";
  if (!id) {
    return null;
  }

  const email = normalizeEmail(record.email);
  const avatarUrl =
    typeof record.avatarUrl === "string"
      ? record.avatarUrl
      : record.avatarUrl === null
        ? null
        : null;

  return {
    id,
    email,
    name: normalizeName(record.name, email),
    avatarUrl
  };
}

export function normalizePlatformUserType(value) {
  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value.trim().toLowerCase();
  if (normalized === "employee" || normalized === "customer" || normalized === "unknown") {
    return normalized;
  }

  return undefined;
}

export function normalizePlatformDepartmentNodes(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((entry) => Boolean(entry && typeof entry === "object"))
    .map((entry) => ({
      id: typeof entry.id === "string" ? entry.id : "",
      name: typeof entry.name === "string" ? entry.name : "",
      parentId: typeof entry.parentId === "string" ? entry.parentId : null
    }))
    .filter((entry) => entry.id && entry.name);
}

export function derivePlatformUserType({ authenticated, role, explicitUserType, user }) {
  if (!authenticated) {
    return "unknown";
  }

  if (explicitUserType && explicitUserType !== "unknown") {
    return explicitUserType;
  }

  const normalizedRole = toNormalizedRole(role);
  if (normalizedRole === "customer") {
    return "customer";
  }
  if (EMPLOYEE_ROLES.has(normalizedRole)) {
    return "employee";
  }

  const normalizedEmail = normalizeEmail(user?.email);
  if (normalizedEmail && normalizedEmail.endsWith(EMPLOYEE_EMAIL_DOMAIN)) {
    return "employee";
  }

  return "customer";
}

export function normalizePlatformSessionAccess(value, explicitUserType = "unknown") {
  if (!value || typeof value !== "object") {
    return {
      ...DEFAULT_PLATFORM_SESSION_ACCESS,
      userType: explicitUserType
    };
  }

  const record = value;
  return {
    userType: normalizePlatformUserType(record.userType) ?? explicitUserType,
    departmentId: typeof record.departmentId === "string" ? record.departmentId : null,
    departmentName: typeof record.departmentName === "string" ? record.departmentName : null,
    departmentPath: normalizePlatformDepartmentNodes(record.departmentPath),
    subDepartments: normalizePlatformDepartmentNodes(record.subDepartments),
    subDepartmentIds: Array.isArray(record.subDepartmentIds)
      ? record.subDepartmentIds.filter((entry) => typeof entry === "string")
      : [],
    isManager: Boolean(record.isManager),
    isAdmin: Boolean(record.isAdmin),
    isExecutive: Boolean(record.isExecutive),
    isSuperAdmin: Boolean(record.isSuperAdmin)
  };
}

export function normalizePlatformSessionPayload(value) {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value;
  if (record.authenticated !== true && record.authenticated !== false) {
    return null;
  }

  const user = normalizePlatformSessionUser(record.user);
  const explicitUserType = normalizePlatformUserType(record.userType) ?? "unknown";
  const role = typeof record.role === "string" ? record.role : "unknown";
  const userType = derivePlatformUserType({
    authenticated: record.authenticated,
    role,
    explicitUserType,
    user
  });
  const access = normalizePlatformSessionAccess(record.access, userType);
  const failure = normalizePlatformSessionFailure(record.failure);

  return {
    authenticated: record.authenticated,
    role,
    userType,
    access: {
      ...access,
      userType
    },
    user,
    failure
  };
}

export function resolveRuntimeAppUrl(appId, runtimeWindow) {
  const activeWindow = getRuntimeWindow(runtimeWindow);
  if (!activeWindow) {
    return undefined;
  }

  const environment = resolveEnvironment(activeWindow.location.hostname);
  return resolveAppUrl(appId, environment) || undefined;
}

export function resolvePlatformAuthAppBaseUrl({
  configuredAuthAppUrl,
  authAppUrl,
  fallbackAuthAppId = "auth",
  runtimeWindow
} = {}) {
  return resolveAuthAppUrl({
    configuredAuthAppUrl,
    fallbackAuthAppUrl: authAppUrl ?? resolveRuntimeAppUrl(fallbackAuthAppId, runtimeWindow)
  });
}

export function resolvePlatformApiBaseUrl({
  configuredPlatformApiBaseUrl,
  configuredAvaApiBaseUrl,
  fallbackApiBaseUrl,
  fallbackApiAppId = "api",
  runtimeWindow
} = {}) {
  return resolveApiBaseUrl({
    configuredPlatformApiBaseUrl,
    configuredAvaApiBaseUrl,
    fallbackApiBaseUrl: fallbackApiBaseUrl ?? resolveRuntimeAppUrl(fallbackApiAppId, runtimeWindow)
  });
}

export function resolvePlatformAppBaseUrl({
  configuredPlatformAppUrl,
  fallbackPlatformAppUrl,
  fallbackPlatformAppId = "dashboard",
  runtimeWindow
} = {}) {
  return resolvePlatformAppUrl({
    configuredPlatformAppUrl,
    fallbackPlatformAppUrl:
      fallbackPlatformAppUrl ?? resolveRuntimeAppUrl(fallbackPlatformAppId, runtimeWindow)
  });
}

export function buildPlatformAuthLoginUrl(returnTo, options = {}) {
  return buildSharedAuthLoginUrl(returnTo, {
    configuredAuthAppUrl: options.configuredAuthAppUrl,
    authAppUrl:
      options.authAppUrl ??
      resolvePlatformAuthAppBaseUrl({
        configuredAuthAppUrl: options.configuredAuthAppUrl,
        fallbackAuthAppId: options.fallbackAuthAppId,
        runtimeWindow: options.runtimeWindow
      }),
    logout: options.logout
  });
}

export function resolvePlatformSessionUrl({
  apiBaseUrl,
  sessionUrl,
  preferSameOriginInLocal = false,
  runtimeWindow
} = {}) {
  if (sessionUrl) {
    return sessionUrl;
  }

  const activeWindow = getRuntimeWindow(runtimeWindow);
  if (preferSameOriginInLocal && activeWindow) {
    const environment = resolveEnvironment(activeWindow.location.hostname);
    if (environment === "local") {
      return `${trimTrailingSlash(activeWindow.location.origin)}${DEFAULT_SESSION_PATH}`;
    }
  }

  if (apiBaseUrl) {
    return `${trimTrailingSlash(apiBaseUrl)}${DEFAULT_SESSION_PATH}`;
  }

  if (activeWindow) {
    return `${trimTrailingSlash(activeWindow.location.origin)}${DEFAULT_SESSION_PATH}`;
  }

  return DEFAULT_SESSION_PATH;
}

export function resolvePlatformLogoutUrl({
  apiBaseUrl,
  logoutUrl,
  preferSameOriginInLocal = false,
  runtimeWindow
} = {}) {
  if (logoutUrl) {
    return logoutUrl;
  }

  const activeWindow = getRuntimeWindow(runtimeWindow);
  if (preferSameOriginInLocal && activeWindow) {
    const environment = resolveEnvironment(activeWindow.location.hostname);
    if (environment === "local") {
      return `${trimTrailingSlash(activeWindow.location.origin)}${DEFAULT_LOGOUT_PATH}`;
    }
  }

  if (apiBaseUrl) {
    return `${trimTrailingSlash(apiBaseUrl)}${DEFAULT_LOGOUT_PATH}`;
  }

  if (activeWindow) {
    return `${trimTrailingSlash(activeWindow.location.origin)}${DEFAULT_LOGOUT_PATH}`;
  }

  return DEFAULT_LOGOUT_PATH;
}

export function readErrorMessage(payload) {
  if (payload && typeof payload === "object" && "error" in payload) {
    const value = payload.error;
    if (typeof value === "string" && value.trim()) {
      return value;
    }
  }
  return undefined;
}

export async function fetchPlatformSession({
  apiBaseUrl,
  sessionUrl,
  preferSameOriginInLocal = false,
  fetchImpl = fetch,
  init,
  runtimeWindow
} = {}) {
  const response = await fetchImpl(
    resolvePlatformSessionUrl({
      apiBaseUrl,
      sessionUrl,
      preferSameOriginInLocal,
      runtimeWindow
    }),
    {
      method: "GET",
      credentials: "include",
      cache: "no-store",
      ...init
    }
  );

  const payload = await response.json().catch(() => null);
  return {
    ok: response.ok,
    status: response.status,
    payload: normalizePlatformSessionPayload(payload)
  };
}

export async function logoutPlatformSession({
  apiBaseUrl,
  logoutUrl,
  preferSameOriginInLocal = false,
  fetchImpl = fetch,
  runtimeWindow
} = {}) {
  return fetchImpl(
    resolvePlatformLogoutUrl({
      apiBaseUrl,
      logoutUrl,
      preferSameOriginInLocal,
      runtimeWindow
    }),
    {
      method: "POST",
      credentials: "include"
    }
  ).catch(() => null);
}

export async function platformAuthApiRequest(path, init = {}, options = {}) {
  const headers = new Headers(init.headers);
  const isFormDataBody =
    typeof FormData !== "undefined" && init.body instanceof FormData;
  if (!headers.has("Content-Type") && init.method && init.method !== "GET" && !isFormDataBody) {
    headers.set("Content-Type", "application/json");
  }

  const requestUrl = path.startsWith("http")
    ? path
    : `${trimTrailingSlash(options.apiBaseUrl ?? "")}${path}`;
  const runFetch = async () => {
    try {
      return await (options.fetchImpl ?? fetch)(requestUrl, {
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
    const refreshSession =
      options.refreshSession ??
      (() =>
        fetchPlatformSession({
          apiBaseUrl: options.apiBaseUrl,
          sessionUrl: options.sessionUrl,
          preferSameOriginInLocal: options.preferSameOriginInLocal,
          fetchImpl: options.fetchImpl,
          runtimeWindow: options.runtimeWindow
        }));
    await refreshSession().catch(() => null);
    response = await runFetch();
  }

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(
      readErrorMessage(payload) ??
        `API request failed (${response.status}) for ${init.method ?? "GET"} ${path}.`
    );
  }

  return payload;
}

export function createPlatformSessionStore({
  initialSnapshot,
  loadSnapshot,
  pollIntervalMs = DEFAULT_POLL_INTERVAL_MS,
  shouldPoll,
  runtimeWindow
}) {
  let snapshot = initialSnapshot;
  let inFlightRefresh = null;
  let intervalId = null;
  let focusHandler = null;
  const listeners = new Set();

  const emit = () => {
    for (const listener of listeners) {
      listener();
    }
  };

  const getActiveWindow = () => getRuntimeWindow(runtimeWindow);

  const syncPolling = () => {
    const activeWindow = getActiveWindow();
    if (!activeWindow) {
      return;
    }

    const shouldUseInterval = shouldPoll ? shouldPoll(snapshot) : true;
    if (shouldUseInterval) {
      if (intervalId === null) {
        intervalId = activeWindow.setInterval(() => {
          void refresh();
        }, pollIntervalMs);
      }
      return;
    }

    if (intervalId !== null) {
      activeWindow.clearInterval(intervalId);
      intervalId = null;
    }
  };

  const start = () => {
    const activeWindow = getActiveWindow();
    if (!activeWindow || focusHandler) {
      return;
    }

    void refresh();
    focusHandler = () => {
      void refresh();
    };
    activeWindow.addEventListener("focus", focusHandler);
    syncPolling();
  };

  const stop = () => {
    const activeWindow = getActiveWindow();
    if (intervalId !== null && activeWindow) {
      activeWindow.clearInterval(intervalId);
    }
    if (focusHandler && activeWindow) {
      activeWindow.removeEventListener("focus", focusHandler);
    }
    intervalId = null;
    focusHandler = null;
  };

  const refresh = async () => {
    if (inFlightRefresh) {
      return inFlightRefresh;
    }

    inFlightRefresh = Promise.resolve(loadSnapshot(snapshot))
      .then((nextSnapshot) => {
        snapshot = nextSnapshot;
        emit();
        if (listeners.size > 0) {
          syncPolling();
        }
        return snapshot;
      })
      .finally(() => {
        inFlightRefresh = null;
      });

    return inFlightRefresh;
  };

  return {
    getSnapshot() {
      return snapshot;
    },
    subscribe(listener) {
      listeners.add(listener);
      if (listeners.size === 1) {
        start();
      }

      return () => {
        listeners.delete(listener);
        if (listeners.size === 0) {
          stop();
        }
      };
    },
    async refresh() {
      return refresh();
    },
    setSnapshot(nextSnapshot) {
      snapshot = nextSnapshot;
      emit();
      if (listeners.size > 0) {
        syncPolling();
      }
    }
  };
}

export function getSetCookieHeaders(headers) {
  const multiValueCookies = typeof headers.getSetCookie === "function" ? headers.getSetCookie() : [];
  if (multiValueCookies.length > 0) {
    return multiValueCookies;
  }

  const singleHeaderCookie = headers.get("set-cookie");
  return singleHeaderCookie ? [singleHeaderCookie] : [];
}

export function appendSetCookieHeaders(response, setCookieHeaders) {
  for (const cookie of setCookieHeaders) {
    response.headers.append("set-cookie", cookie);
  }
}

export async function fetchPlatformSessionForCookieHeader({
  cookieHeader,
  apiBaseUrl,
  sessionPath = DEFAULT_SESSION_PATH,
  fetchImpl = fetch
}) {
  const response = await fetchImpl(`${trimTrailingSlash(apiBaseUrl)}${sessionPath}`, {
    method: "GET",
    headers: {
      cookie: cookieHeader ?? ""
    },
    cache: "no-store"
  });

  const payload = await response.json().catch(() => null);
  return {
    ok: response.ok,
    status: response.status,
    payload: normalizePlatformSessionPayload(payload),
    setCookieHeaders: getSetCookieHeaders(response.headers)
  };
}

export async function fetchPlatformSessionForRequest({
  request,
  apiBaseUrl,
  sessionPath = DEFAULT_SESSION_PATH,
  fetchImpl = fetch
}) {
  return fetchPlatformSessionForCookieHeader({
    cookieHeader: request.headers.get("cookie"),
    apiBaseUrl,
    sessionPath,
    fetchImpl
  });
}
