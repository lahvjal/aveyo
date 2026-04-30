import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { resolveAppUrl, resolveEnvironment, trimTrailingSlash } from "@ava/config/runtime/app-urls";
import { getAuthSessionResultWithOptions } from "@/lib/auth/session";

function resolveRequestOrigin(headerStore: Headers) {
  const host = headerStore.get("x-forwarded-host") ?? headerStore.get("host") ?? "api.aveyo.com";
  const protocol =
    headerStore.get("x-forwarded-proto") ??
    (host.startsWith("localhost") || host.startsWith("127.0.0.1") ? "http" : "https");
  return `${protocol}://${host}`;
}

function toSessionRequest(headerStore: Headers, origin: string) {
  const requestHeaders = new Headers();
  const host = headerStore.get("host");
  const forwardedHost = headerStore.get("x-forwarded-host");
  const forwardedProto = headerStore.get("x-forwarded-proto");
  const cookie = headerStore.get("cookie");

  if (host) requestHeaders.set("host", host);
  if (forwardedHost) requestHeaders.set("x-forwarded-host", forwardedHost);
  if (forwardedProto) requestHeaders.set("x-forwarded-proto", forwardedProto);
  if (cookie) requestHeaders.set("cookie", cookie);

  return new Request(`${origin}/`, {
    method: "GET",
    headers: requestHeaders
  });
}

export default async function HomePage() {
  const headerStore = await headers();
  const origin = resolveRequestOrigin(headerStore);
  const host = (headerStore.get("x-forwarded-host") ?? headerStore.get("host") ?? "").split(":")[0];
  const environment = resolveEnvironment(host);
  const authAppUrl = trimTrailingSlash(resolveAppUrl("auth", environment) || "https://auth.aveyo.com");
  const appUrl = trimTrailingSlash(resolveAppUrl("app", environment) || "https://app.aveyo.com");
  const sessionRequest = toSessionRequest(headerStore, origin);
  const session = await getAuthSessionResultWithOptions(sessionRequest, { allowTokenRefresh: true });

  if (session.authenticated) {
    redirect(appUrl);
  }

  redirect(`${authAppUrl}/login?returnTo=${encodeURIComponent(`${origin}/`)}`);
}
