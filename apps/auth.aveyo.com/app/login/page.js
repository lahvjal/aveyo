"use client";

import { useEffect, useState } from "react";
import {
  getAuthApiBaseUrl,
  getCustomerAppUrl,
  getEmployeeAppUrl
} from "../../lib/config";
import { getSupabaseBrowserClient } from "../../lib/supabase/client";

function describeAuthError(error, fallback) {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return fallback;
}

function parseLoginRequestFromWindow() {
  if (typeof window === "undefined") {
    return {
      logoutRequested: false
    };
  }

  const params = new URLSearchParams(window.location.search);
  return {
    logoutRequested: params.get("logout") === "1"
  };
}

function readApiErrorMessage(payload, fallback) {
  if (payload && typeof payload === "object" && "error" in payload) {
    const maybeError = payload.error;
    if (typeof maybeError === "string" && maybeError.trim()) {
      return maybeError;
    }
  }

  return fallback;
}

function normalizeRole(value) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim().toLowerCase();
}

function readRoleFromSessionPayload(payload) {
  if (!payload || typeof payload !== "object" || !("role" in payload)) {
    return "";
  }

  return normalizeRole(payload.role);
}

function readRoleFromSupabaseSession(session) {
  if (!session || typeof session !== "object") {
    return "";
  }

  return (
    normalizeRole(session.user?.app_metadata?.app_role) ||
    normalizeRole(session.user?.app_metadata?.role) ||
    normalizeRole(session.user?.user_metadata?.role)
  );
}

function resolveRedirectTarget({ sessionPayload, session }) {
  const role = readRoleFromSessionPayload(sessionPayload) || readRoleFromSupabaseSession(session);
  if (role === "customer") {
    return {
      label: "customer app",
      url: getCustomerAppUrl()
    };
  }

  return {
    label: "employee app",
    url: getEmployeeAppUrl()
  };
}

async function clearPlatformCookieSession() {
  const endpoint = `${getAuthApiBaseUrl()}/api/auth/session/logout`;
  const response = await fetch(endpoint, {
    method: "POST",
    credentials: "include",
    cache: "no-store"
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(readApiErrorMessage(payload, "Unable to clear platform session cookies."));
  }
}

async function bootstrapPlatformCookieSession(session) {
  const endpoint = `${getAuthApiBaseUrl()}/api/auth/session/bootstrap`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    credentials: "include",
    cache: "no-store",
    body: JSON.stringify({
      accessToken: session.access_token,
      refreshToken: session.refresh_token
    })
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(readApiErrorMessage(payload, "Unable to establish shared session cookies."));
  }

  const sessionCheckResponse = await fetch(`${getAuthApiBaseUrl()}/api/auth/session`, {
    method: "GET",
    credentials: "include",
    cache: "no-store"
  });
  const sessionCheckPayload = await sessionCheckResponse.json().catch(() => null);
  if (!sessionCheckResponse.ok || !sessionCheckPayload?.authenticated) {
    throw new Error(
      readApiErrorMessage(
        sessionCheckPayload,
        "Session cookies were set but could not be verified. Check cookie domain/secure settings."
      )
    );
  }

  return sessionCheckPayload;
}

export default function LoginPage() {
  const [supabase, setSupabase] = useState(null);
  const [logoutRequested, setLogoutRequested] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [pending, setPending] = useState(true);
  const [status, setStatus] = useState("");
  const [statusTone, setStatusTone] = useState("info");

  useEffect(() => {
    const { logoutRequested: shouldLogout } = parseLoginRequestFromWindow();
    setLogoutRequested(shouldLogout);

    try {
      setSupabase(getSupabaseBrowserClient());
    } catch (error) {
      setStatusTone("error");
      setStatus(describeAuthError(error, "Unable to initialize Supabase client."));
      setPending(false);
    }
  }, []);

  useEffect(() => {
    if (!supabase) {
      return;
    }

    let cancelled = false;
    async function bootstrapSession() {
      setPending(true);
      setStatusTone("info");
      setStatus(logoutRequested ? "Signing out old session..." : "Checking existing session...");

      try {
        if (logoutRequested) {
          await supabase.auth.signOut();
          await clearPlatformCookieSession();
        }

        const {
          data: { session }
        } = await supabase.auth.getSession();
        if (cancelled) {
          return;
        }

        if (session) {
          setStatus("Active session found. Establishing shared cookies...");
          const sessionPayload = await bootstrapPlatformCookieSession(session);
          if (cancelled) {
            return;
          }
          const target = resolveRedirectTarget({ sessionPayload, session });
          setStatus(`Session ready. Redirecting to ${target.label}...`);
          window.location.replace(target.url);
          return;
        }

        setStatus("");
      } catch (error) {
        if (cancelled) {
          return;
        }
        setStatusTone("error");
        setStatus(describeAuthError(error, "Unable to initialize auth session."));
      } finally {
        if (!cancelled) {
          setPending(false);
        }
      }
    }

    void bootstrapSession();
    return () => {
      cancelled = true;
    };
  }, [supabase, logoutRequested]);

  async function handleSignIn(event) {
    event.preventDefault();
    if (!supabase) {
      return;
    }

    setPending(true);
    setStatusTone("info");
    setStatus("Signing in...");
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password
      });
      if (error) {
        throw error;
      }

      const session =
        data.session ??
        (
          await supabase.auth.getSession()
        ).data.session;
      if (!session) {
        throw new Error("Sign-in succeeded but no session was returned.");
      }

      setStatus("Establishing shared cookies...");
      const sessionPayload = await bootstrapPlatformCookieSession(session);
      const target = resolveRedirectTarget({ sessionPayload, session });
      setStatus(`Session ready. Redirecting to ${target.label}...`);
      window.location.replace(target.url);
    } catch (error) {
      setStatusTone("error");
      setStatus(describeAuthError(error, "Unable to sign in."));
      setPending(false);
    }
  }

  async function handleForgotPassword(event) {
    event.preventDefault();
    if (!supabase) {
      return;
    }
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setStatusTone("error");
      setStatus("Enter your email first to receive a reset link.");
      return;
    }

    setPending(true);
    setStatusTone("info");
    setStatus("Sending password reset email...");
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(trimmedEmail);
      if (error) {
        throw error;
      }
      setStatus("Password reset email sent.");
    } catch (error) {
      setStatusTone("error");
      setStatus(describeAuthError(error, "Unable to send password reset email."));
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="login-shell">
      <img src="/aveyo-logo.svg" alt="Aveyo" className="login-brand" />

      <section className="login-frame">
        <div className="login-visual" aria-hidden="true" />

        <section className="login-panel">
          <h1 className="login-title">Login</h1>
          <p className="login-subtitle">Access your Aveyo account</p>

          <form onSubmit={handleSignIn} className="login-form">
            <label className="login-field">
              <span>Your email</span>
              <input
                type="email"
                placeholder="name@email.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                required
                disabled={pending}
              />
            </label>

            <label className="login-field">
              <span>Password</span>
              <div className="login-password-shell">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••••••••"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="current-password"
                  required
                  disabled={pending}
                />
                <button
                  type="button"
                  className="login-password-toggle"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  onClick={() => setShowPassword((current) => !current)}
                  disabled={pending}
                >
                  <svg viewBox="0 0 20 13" aria-hidden="true">
                    <path d="M3.0858 2.69223C6.67563 -0.897383 12.496 -0.897435 16.0858 2.69223L18.8788 5.4852C19.2691 5.87564 19.269 6.50876 18.8788 6.89926L16.0858 9.69223L15.743 10.0184C12.251 13.1736 6.9207 13.1735 3.42857 10.0184L3.0858 9.69223L0.292831 6.89926C-0.097569 6.50872 -0.0976518 5.87568 0.292831 5.4852L3.0858 2.69223ZM14.6717 4.10629C11.863 1.29768 7.30864 1.29773 4.49986 4.10629L2.41392 6.19223L4.49986 8.27816C7.30867 11.0869 11.863 11.0869 14.6717 8.27816L16.7577 6.19223L14.6717 4.10629ZM9.5858 3.79477C10.9101 3.79477 11.984 4.86798 11.9842 6.19223C11.9842 7.51664 10.9102 8.59066 9.5858 8.59066C8.26144 8.5906 7.18834 7.5166 7.18834 6.19223C7.18854 4.86802 8.26156 3.79483 9.5858 3.79477Z" />
                  </svg>
                </button>
              </div>
            </label>

            <button type="submit" className="login-primary-button" disabled={pending}>
              Login
            </button>
          </form>

          <div className="login-divider" aria-hidden="true">
            <span className="login-divider-line" />
            <p>Or continue with</p>
            <span className="login-divider-line" />
          </div>

          <button type="button" className="login-google-button" disabled>
            Google
          </button>

          <button
            type="button"
            className="login-forgot-button"
            onClick={(event) => {
              void handleForgotPassword(event);
            }}
            disabled={pending || !supabase}
          >
            Forgot password?
          </button>

          {status ? (
            <p className="login-status" data-tone={statusTone}>
              {status}
            </p>
          ) : null}
        </section>
      </section>
    </main>
  );
}
