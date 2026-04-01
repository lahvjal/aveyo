"use client";

import { useEffect } from "react";
import { buildAuthLoginUrl } from "@/lib/auth/config";
import { logoutAuthSession } from "@/lib/auth/session";
import { useAuthSession } from "@/lib/auth/use-auth-session";

export default function HomePage() {
  const session = useAuthSession();

  useEffect(() => {
    if (session.loading || session.authenticated || typeof window === "undefined") {
      return;
    }

    const returnTo = `${window.location.origin}/`;
    window.location.replace(buildAuthLoginUrl(returnTo));
  }, [session.loading, session.authenticated]);

  if (session.loading || !session.authenticated) {
    return <main>Checking session...</main>;
  }

  return (
    <main>
      <h1>Authenticated App</h1>
      <p>Signed in as {session.user?.name ?? session.user?.email ?? "account"}.</p>
      <p>Role: {session.role}</p>
      <button
        type="button"
        onClick={async () => {
          await logoutAuthSession();
          const returnTo = `${window.location.origin}/`;
          window.location.replace(buildAuthLoginUrl(returnTo, { logout: true }));
        }}
      >
        Sign out
      </button>
    </main>
  );
}
