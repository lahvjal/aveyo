"use client";

import { useEffect } from "react";
import { buildAuthLoginUrl, getPostLoginRedirectUrl } from "@/lib/auth/config";
import { useAuthSession } from "@/lib/auth/use-auth-session";

export default function HomePage() {
  const session = useAuthSession();

  useEffect(() => {
    if (session.loading || typeof window === "undefined") {
      return;
    }

    const returnTo = getPostLoginRedirectUrl();
    if (!session.authenticated) {
      window.location.replace(buildAuthLoginUrl(returnTo));
      return;
    }

    window.location.replace(returnTo);
  }, [session.loading, session.authenticated]);

  return <main>Checking session...</main>;
}
