"use client";

import { useEffect } from "react";
import { buildAuthLoginUrl, getPostLoginRedirectUrl } from "@/lib/auth/config";

export default function LoginRedirectPage() {
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const logout = params.get("logout") === "1";
    const returnTo = getPostLoginRedirectUrl();
    window.location.replace(buildAuthLoginUrl(returnTo, { logout }));
  }, []);

  return <main>Redirecting to sign in...</main>;
}
