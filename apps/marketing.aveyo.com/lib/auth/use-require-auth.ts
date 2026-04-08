"use client";

import { useEffect } from "react";
import { buildAuthLoginUrl } from "./config";
import { useAuthSession } from "./use-auth-session";

export function useRequireAuth() {
  const session = useAuthSession();

  useEffect(() => {
    if (session.loading || session.authenticated || typeof window === "undefined") {
      return;
    }

    const returnTo = `${window.location.origin}${window.location.pathname}${window.location.search}`;
    window.location.replace(buildAuthLoginUrl(returnTo));
  }, [session.loading, session.authenticated]);

  return session;
}
