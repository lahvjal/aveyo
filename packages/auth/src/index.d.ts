export type PlatformUserType = "employee" | "customer" | "unknown";

export interface PlatformSessionFailure {
  reason: string;
  expectedProjectRef?: string | null;
  actualProjectRef?: string | null;
}

export interface PlatformSessionUser {
  id: string;
  email: string | null;
  name: string;
  avatarUrl: string | null;
}

export interface PlatformDepartmentNode {
  id: string;
  name: string;
  parentId: string | null;
}

export interface PlatformSessionAccess {
  userType: PlatformUserType;
  departmentId: string | null;
  departmentName: string | null;
  departmentPath: PlatformDepartmentNode[];
  subDepartments: PlatformDepartmentNode[];
  subDepartmentIds: string[];
  isManager: boolean;
  isAdmin: boolean;
  isExecutive: boolean;
  isSuperAdmin: boolean;
}

export interface PlatformSessionPayload {
  authenticated: boolean;
  role: string;
  userType: PlatformUserType;
  access: PlatformSessionAccess;
  user: PlatformSessionUser | null;
  failure?: PlatformSessionFailure;
}

export interface PlatformSessionFetchResult {
  ok: boolean;
  status: number;
  payload: PlatformSessionPayload | null;
}

export interface PlatformSessionStore<TSnapshot> {
  getSnapshot(): TSnapshot;
  subscribe(listener: () => void): () => void;
  refresh(): Promise<TSnapshot>;
  setSnapshot(nextSnapshot: TSnapshot): void;
}

export interface PlatformSessionStoreOptions<TSnapshot> {
  initialSnapshot: TSnapshot;
  loadSnapshot: (currentSnapshot: TSnapshot) => Promise<TSnapshot> | TSnapshot;
  pollIntervalMs?: number;
  shouldPoll?: (currentSnapshot: TSnapshot) => boolean;
  runtimeWindow?: Window | null;
}

export interface ResolvePlatformAuthAppBaseUrlOptions {
  configuredAuthAppUrl?: string;
  authAppUrl?: string;
  fallbackAuthAppId?: string;
  runtimeWindow?: Window | null;
}

export interface ResolvePlatformApiBaseUrlOptions {
  configuredPlatformApiBaseUrl?: string;
  configuredAvaApiBaseUrl?: string;
  fallbackApiBaseUrl?: string;
  fallbackApiAppId?: string;
  runtimeWindow?: Window | null;
}

export interface ResolvePlatformAppBaseUrlOptions {
  configuredPlatformAppUrl?: string;
  fallbackPlatformAppUrl?: string;
  fallbackPlatformAppId?: string;
  runtimeWindow?: Window | null;
}

export interface BuildPlatformAuthLoginUrlOptions {
  configuredAuthAppUrl?: string;
  authAppUrl?: string;
  fallbackAuthAppId?: string;
  logout?: boolean;
  runtimeWindow?: Window | null;
}

export interface ResolvePlatformSessionUrlOptions {
  apiBaseUrl?: string;
  sessionUrl?: string;
  preferSameOriginInLocal?: boolean;
  runtimeWindow?: Window | null;
}

export interface ResolvePlatformLogoutUrlOptions {
  apiBaseUrl?: string;
  logoutUrl?: string;
  preferSameOriginInLocal?: boolean;
  runtimeWindow?: Window | null;
}

export interface FetchPlatformSessionOptions extends ResolvePlatformSessionUrlOptions {
  fetchImpl?: typeof fetch;
  init?: RequestInit;
}

export interface LogoutPlatformSessionOptions extends ResolvePlatformLogoutUrlOptions {
  fetchImpl?: typeof fetch;
}

export interface PlatformAuthApiRequestOptions {
  apiBaseUrl?: string;
  sessionUrl?: string;
  preferSameOriginInLocal?: boolean;
  refreshSession?: () => Promise<unknown>;
  fetchImpl?: typeof fetch;
  runtimeWindow?: Window | null;
}

export interface FetchPlatformSessionForCookieHeaderOptions {
  cookieHeader?: string | null;
  apiBaseUrl: string;
  sessionPath?: string;
  fetchImpl?: typeof fetch;
}

export interface FetchPlatformSessionForRequestOptions {
  request: Request;
  apiBaseUrl: string;
  sessionPath?: string;
  fetchImpl?: typeof fetch;
}

export declare const DEFAULT_PLATFORM_SESSION_ACCESS: Readonly<PlatformSessionAccess>;

export declare function normalizePlatformSessionUser(value: unknown): PlatformSessionUser | null;
export declare function normalizePlatformUserType(value: unknown): PlatformUserType | undefined;
export declare function normalizePlatformDepartmentNodes(value: unknown): PlatformDepartmentNode[];
export declare function derivePlatformUserType(params: {
  authenticated: boolean;
  role?: string | null;
  explicitUserType?: PlatformUserType;
  user: PlatformSessionUser | null;
}): PlatformUserType;
export declare function normalizePlatformSessionAccess(
  value: unknown,
  explicitUserType?: PlatformUserType
): PlatformSessionAccess;
export declare function normalizePlatformSessionPayload(value: unknown): PlatformSessionPayload | null;
export declare function resolveRuntimeAppUrl(
  appId: string,
  runtimeWindow?: Window | null
): string | undefined;
export declare function resolvePlatformAuthAppBaseUrl(
  options?: ResolvePlatformAuthAppBaseUrlOptions
): string;
export declare function resolvePlatformApiBaseUrl(
  options?: ResolvePlatformApiBaseUrlOptions
): string;
export declare function resolvePlatformAppBaseUrl(
  options?: ResolvePlatformAppBaseUrlOptions
): string;
export declare function buildPlatformAuthLoginUrl(
  returnTo: string,
  options?: BuildPlatformAuthLoginUrlOptions
): string;
export declare function resolvePlatformSessionUrl(
  options?: ResolvePlatformSessionUrlOptions
): string;
export declare function resolvePlatformLogoutUrl(
  options?: ResolvePlatformLogoutUrlOptions
): string;
export declare function readErrorMessage(payload: unknown): string | undefined;
export declare function fetchPlatformSession(
  options?: FetchPlatformSessionOptions
): Promise<PlatformSessionFetchResult>;
export declare function logoutPlatformSession(
  options?: LogoutPlatformSessionOptions
): Promise<Response | null>;
export declare function platformAuthApiRequest<T = unknown>(
  path: string,
  init?: RequestInit,
  options?: PlatformAuthApiRequestOptions
): Promise<T>;
export declare function createPlatformSessionStore<TSnapshot>(
  options: PlatformSessionStoreOptions<TSnapshot>
): PlatformSessionStore<TSnapshot>;
export declare function getSetCookieHeaders(headers: Headers): string[];
export declare function appendSetCookieHeaders(
  response: { headers: Headers },
  setCookieHeaders: string[]
): void;
export declare function fetchPlatformSessionForCookieHeader(
  options: FetchPlatformSessionForCookieHeaderOptions
): Promise<{
  ok: boolean;
  status: number;
  payload: PlatformSessionPayload | null;
  setCookieHeaders: string[];
}>;
export declare function fetchPlatformSessionForRequest(
  options: FetchPlatformSessionForRequestOptions
): Promise<{
  ok: boolean;
  status: number;
  payload: PlatformSessionPayload | null;
  setCookieHeaders: string[];
}>;
