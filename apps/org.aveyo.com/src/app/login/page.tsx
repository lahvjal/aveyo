"use client";

import { useEffect } from "react";
import { buildAuthLoginUrl, getPostLoginRedirectUrl } from "@/lib/auth/config";

function resolveReturnToFromQuery(fallbackReturnTo: string) {
  if (typeof window === "undefined") {
    return fallbackReturnTo;
  }

  const params = new URLSearchParams(window.location.search);
  const requestedReturnTo = params.get("returnTo")?.trim() || "";
  if (!requestedReturnTo) {
    return fallbackReturnTo;
  }

  try {
    const parsed = new URL(requestedReturnTo, window.location.origin);
    if (parsed.origin !== window.location.origin) {
      return fallbackReturnTo;
    }
    return parsed.toString();
  } catch {
    return fallbackReturnTo;
  }
}

export default function LoginRedirectPage() {
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const logout = params.get("logout") === "1";
    const returnTo = resolveReturnToFromQuery(getPostLoginRedirectUrl());
    window.location.replace(buildAuthLoginUrl(returnTo, { logout }));
  }, []);

  return <main>Redirecting to sign in...</main>;
}
