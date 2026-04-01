interface BuildAuthLoginUrlOptions {
  logout?: boolean;
}

export function getAuthAppUrl() {
  const configured = process.env.NEXT_PUBLIC_AUTH_APP_URL?.trim();
  if (!configured) {
    return "http://localhost:4003";
  }

  return configured.replace(/\/$/, "");
}

export function getApiBaseUrl() {
  const configured =
    process.env.NEXT_PUBLIC_PLATFORM_API_BASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_AVA_API_BASE_URL?.trim();
  if (!configured) {
    return "http://localhost:4002";
  }

  return configured.replace(/\/$/, "");
}

export function buildAuthLoginUrl(returnTo: string, options: BuildAuthLoginUrlOptions = {}) {
  const authUrl = new URL("/login", getAuthAppUrl());
  authUrl.searchParams.set("returnTo", returnTo);
  if (options.logout) {
    authUrl.searchParams.set("logout", "1");
  }
  return authUrl.toString();
}
