"use client";

import { useEffect, useState } from "react";
import { fetchAuthSession } from "./session";

const defaultSession = {
  loading: true,
  authenticated: false,
  role: "unknown",
  user: null
};

const sessionPollIntervalMs = 30000;

export function useAuthSession() {
  const [session, setSession] = useState(defaultSession);

  useEffect(() => {
    let cancelled = false;

    async function loadSession() {
      try {
        const result = await fetchAuthSession();
        if (cancelled) {
          return;
        }

        if (!result.ok || !result.payload?.authenticated) {
          setSession({
            loading: false,
            authenticated: false,
            role: result.payload?.role ?? "unknown",
            user: result.payload?.user ?? null
          });
          return;
        }

        setSession({
          loading: false,
          authenticated: true,
          role: result.payload.role ?? "unknown",
          user: result.payload.user ?? null
        });
      } catch {
        if (cancelled) {
          return;
        }
        setSession({
          loading: false,
          authenticated: false,
          role: "unknown",
          user: null
        });
      }
    }

    void loadSession();
    const interval = window.setInterval(() => {
      void loadSession();
    }, sessionPollIntervalMs);

    const onFocus = () => {
      void loadSession();
    };
    window.addEventListener("focus", onFocus);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  return session;
}
