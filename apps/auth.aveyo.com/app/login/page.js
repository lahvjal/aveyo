"use client";

import { useEffect, useMemo, useState } from "react";
import {
  getAveyoAppUrl,
  getAuthApiBaseUrl,
  getCustomerAppUrl,
  getEmployeeAppUrl
} from "../../lib/config";
import { getSupabaseBrowserClient } from "../../lib/supabase/client";

const LOCAL_HOST_PATTERN =
  /^(localhost|127(?:\.\d{1,3}){3}|10(?:\.\d{1,3}){3}|172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2}|192\.168(?:\.\d{1,3}){2}|0\.0\.0\.0|::1|.+\.local)$/i;
const PASSWORD_MIN_LENGTH = 8;
const RECOVERY_MODE = "recovery";

function describeAuthError(error, fallback) {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return fallback;
}

function normalizeAllowlistOrigin(value) {
  const raw = typeof value === "string" ? value.trim() : "";
  if (!raw) {
    return "";
  }

  try {
    return new URL(raw).origin;
  } catch {
    return "";
  }
}

function getConfiguredReturnToOrigins() {
  const rawAllowlist = process.env.NEXT_PUBLIC_AUTH_RETURN_TO_ALLOWLIST || "";
  if (!rawAllowlist.trim()) {
    return [];
  }

  const origins = rawAllowlist
    .split(",")
    .map((entry) => normalizeAllowlistOrigin(entry))
    .filter(Boolean);
  return Array.from(new Set(origins));
}

function isTrustedAveyoHostname(hostname) {
  const normalized = typeof hostname === "string" ? hostname.trim().toLowerCase() : "";
  if (!normalized) {
    return false;
  }

  return (
    normalized === "aveyo.com" ||
    normalized.endsWith(".aveyo.com") ||
    LOCAL_HOST_PATTERN.test(normalized)
  );
}

function resolveTrustedReturnToUrl(value) {
  const raw = typeof value === "string" ? value.trim() : "";
  if (!raw) {
    return "";
  }

  try {
    const parsed = new URL(raw);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      return "";
    }

    const allowlistedOrigins = getConfiguredReturnToOrigins();
    if (allowlistedOrigins.length > 0) {
      return allowlistedOrigins.includes(parsed.origin) ? parsed.toString() : "";
    }

    return isTrustedAveyoHostname(parsed.hostname) ? parsed.toString() : "";
  } catch {
    return "";
  }
}

function resolveRequestedReturnTo(params) {
  const directReturnTo = resolveTrustedReturnToUrl(params.get("returnTo"));
  if (directReturnTo) {
    return directReturnTo;
  }

  const redirectTo = params.get("redirect_to");
  if (!redirectTo) {
    return "";
  }

  try {
    const parsedRedirect = new URL(redirectTo);
    return resolveTrustedReturnToUrl(parsedRedirect.searchParams.get("returnTo"));
  } catch {
    return "";
  }
}

function normalizeOtpType(value) {
  const normalized = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (!normalized) {
    return "";
  }

  if (normalized === "magiclink" || normalized === "recovery" || normalized === "signup") {
    return normalized;
  }

  return "";
}

function parseLoginRequestFromWindow() {
  if (typeof window === "undefined") {
    return {
      logoutRequested: false,
      requestedReturnTo: "",
      callbackCode: "",
      callbackTokenHash: "",
      callbackType: "",
      callbackMode: "",
      callbackError: ""
    };
  }

  const params = new URLSearchParams(window.location.search);
  return {
    logoutRequested: params.get("logout") === "1",
    requestedReturnTo: resolveRequestedReturnTo(params),
    callbackCode: params.get("code")?.trim() ?? "",
    callbackTokenHash: params.get("token_hash")?.trim() ?? "",
    callbackType: normalizeOtpType(params.get("type")),
    callbackMode: params.get("mode") === RECOVERY_MODE ? RECOVERY_MODE : "",
    callbackError:
      params.get("error_description")?.trim() || params.get("error")?.trim() || ""
  };
}

function replaceLoginUrl({ requestedReturnTo, mode = "" }) {
  if (typeof window === "undefined") {
    return;
  }

  const nextUrl = new URL("/login", window.location.origin);
  if (requestedReturnTo) {
    nextUrl.searchParams.set("returnTo", requestedReturnTo);
  }
  if (mode === RECOVERY_MODE) {
    nextUrl.searchParams.set("mode", RECOVERY_MODE);
  }
  window.history.replaceState({}, "", nextUrl.toString());
}

function buildHostedRecoveryRedirectUrl(requestedReturnTo) {
  if (typeof window === "undefined") {
    return "";
  }

  const redirectUrl = new URL("/auth/callback", window.location.origin);
  redirectUrl.searchParams.set("mode", RECOVERY_MODE);
  if (requestedReturnTo) {
    redirectUrl.searchParams.set("returnTo", requestedReturnTo);
  }
  return redirectUrl.toString();
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

async function startHostedLogin(email, requestedReturnTo) {
  const response = await fetch(`${getAuthApiBaseUrl()}/api/auth/login/start`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    credentials: "include",
    cache: "no-store",
    body: JSON.stringify({
      email,
      returnTo: requestedReturnTo
    })
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(readApiErrorMessage(payload, "Unable to continue sign in."));
  }

  if (
    payload?.nextStep !== "password" &&
    payload?.nextStep !== "emailLinkNotice" &&
    payload?.nextStep !== "noAccount"
  ) {
    throw new Error("Login service returned an unknown step.");
  }

  return payload.nextStep;
}

async function processIncomingAuthCallback(activeSupabase, callbackRequest) {
  if (!callbackRequest.code && !(callbackRequest.tokenHash && callbackRequest.type)) {
    if (callbackRequest.error) {
      throw new Error(callbackRequest.error);
    }
    return false;
  }

  if (callbackRequest.code) {
    const { error } = await activeSupabase.auth.exchangeCodeForSession(callbackRequest.code);
    if (error) {
      throw error;
    }
  } else if (callbackRequest.tokenHash && callbackRequest.type) {
    const { error } = await activeSupabase.auth.verifyOtp({
      token_hash: callbackRequest.tokenHash,
      type: callbackRequest.type
    });
    if (error) {
      throw error;
    }
  }

  replaceLoginUrl({
    requestedReturnTo: callbackRequest.requestedReturnTo,
    mode: callbackRequest.mode
  });
  return true;
}

function getPanelCopy(loginStep) {
  switch (loginStep) {
    case "password":
      return {
        title: "Enter your password",
        subtitle: "This email belongs to an employee account."
      };
    case "notice":
      return {
        title: "Check your email",
        subtitle:
          "We sent a secure sign-in link to the address below. If this email is in our active customer-project system, it will arrive there shortly."
      };
    case "noAccount":
      return {
        title: "No matching account",
        subtitle:
          "We could not find an active employee profile or customer project for that email. Try another address, or contact your Aveyo representative if you believe this is a mistake."
      };
    case "resetPassword":
      return {
        title: "Set a new password",
        subtitle: "Create a new password for your employee account."
      };
    default:
      return {
        title: "Login",
        subtitle: "Enter your email to continue."
      };
  }
}

function PasswordField({
  label,
  value,
  onChange,
  placeholder,
  autoComplete,
  showValue,
  onToggle,
  toggleLabel,
  disabled
}) {
  return (
    <label className="login-field">
      <span>{label}</span>
      <div className="login-password-shell">
        <input
          type={showValue ? "text" : "password"}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          autoComplete={autoComplete}
          required
          disabled={disabled}
        />
        <button
          type="button"
          className="login-password-toggle"
          aria-label={toggleLabel}
          onClick={onToggle}
          disabled={disabled}
        >
          <svg viewBox="0 0 20 13" aria-hidden="true">
            <path d="M3.0858 2.69223C6.67563 -0.897383 12.496 -0.897435 16.0858 2.69223L18.8788 5.4852C19.2691 5.87564 19.269 6.50876 18.8788 6.89926L16.0858 9.69223L15.743 10.0184C12.251 13.1736 6.9207 13.1735 3.42857 10.0184L3.0858 9.69223L0.292831 6.89926C-0.097569 6.50872 -0.0976518 5.87568 0.292831 5.4852L3.0858 2.69223ZM14.6717 4.10629C11.863 1.29768 7.30864 1.29773 4.49986 4.10629L2.41392 6.19223L4.49986 8.27816C7.30867 11.0869 11.863 11.0869 14.6717 8.27816L16.7577 6.19223L14.6717 4.10629ZM9.5858 3.79477C10.9101 3.79477 11.984 4.86798 11.9842 6.19223C11.9842 7.51664 10.9102 8.59066 9.5858 8.59066C8.26144 8.5906 7.18834 7.5166 7.18834 6.19223C7.18854 4.86802 8.26156 3.79483 9.5858 3.79477Z" />
          </svg>
        </button>
      </div>
    </label>
  );
}

export default function LoginPage() {
  const [supabase, setSupabase] = useState(null);
  const [logoutRequested, setLogoutRequested] = useState(false);
  const [requestedReturnTo, setRequestedReturnTo] = useState("");
  const [callbackRequest, setCallbackRequest] = useState({
    code: "",
    tokenHash: "",
    type: "",
    mode: "",
    error: ""
  });
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loginStep, setLoginStep] = useState("email");
  const [isBootstrappingSession, setIsBootstrappingSession] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState("");
  const [statusTone, setStatusTone] = useState("info");

  const aveyoAppUrl = useMemo(() => getAveyoAppUrl(), []);
  const panelCopy = useMemo(() => getPanelCopy(loginStep), [loginStep]);
  const callbackCode = callbackRequest.code;
  const callbackTokenHash = callbackRequest.tokenHash;
  const callbackType = callbackRequest.type;
  const callbackMode = callbackRequest.mode;
  const callbackError = callbackRequest.error;

  useEffect(() => {
    const parsedRequest = parseLoginRequestFromWindow();
    setLogoutRequested(parsedRequest.logoutRequested);
    setRequestedReturnTo(parsedRequest.requestedReturnTo);
    setCallbackRequest({
      code: parsedRequest.callbackCode,
      tokenHash: parsedRequest.callbackTokenHash,
      type: parsedRequest.callbackType,
      mode: parsedRequest.callbackMode,
      error: parsedRequest.callbackError
    });

    try {
      setSupabase(getSupabaseBrowserClient());
    } catch (error) {
      setStatusTone("error");
      setStatus(describeAuthError(error, "Unable to initialize Supabase client."));
    } finally {
      setIsBootstrappingSession(false);
    }
  }, []);

  useEffect(() => {
    if (!supabase) {
      return;
    }

    let cancelled = false;

    async function bootstrapSession() {
      setIsBootstrappingSession(true);
      setStatusTone("info");

      if (logoutRequested) {
        setStatus("Signing out old session...");
      } else if (callbackCode || callbackTokenHash || callbackError) {
        setStatus("Completing sign in...");
      } else if (callbackMode === RECOVERY_MODE) {
        setStatus("Preparing password reset...");
      } else {
        setStatus("Checking existing session...");
      }

      try {
        if (logoutRequested) {
          await supabase.auth.signOut();
          await clearPlatformCookieSession();
          replaceLoginUrl({ requestedReturnTo });
        }

        if (callbackError) {
          replaceLoginUrl({
            requestedReturnTo,
            mode: callbackMode
          });
          throw new Error(callbackError);
        }

        if (callbackCode || (callbackTokenHash && callbackType)) {
          await processIncomingAuthCallback(supabase, {
            code: callbackCode,
            tokenHash: callbackTokenHash,
            type: callbackType,
            mode: callbackMode,
            error: callbackError,
            requestedReturnTo
          });
        }

        const {
          data: { session }
        } = await supabase.auth.getSession();
        if (cancelled) {
          return;
        }

        if (session?.user?.email) {
          setEmail(session.user.email);
        }

        if (session) {
          if (callbackMode === RECOVERY_MODE) {
            setLoginStep("resetPassword");
            setStatus("");
            return;
          }

          setStatus("Establishing shared cookies...");
          const sessionPayload = await bootstrapPlatformCookieSession(session);
          if (cancelled) {
            return;
          }
          const target = resolveRedirectTarget({ sessionPayload, session });
          setStatus(`Session ready. Redirecting to ${target.label}...`);
          window.location.replace(target.url);
          return;
        }

        if (callbackMode === RECOVERY_MODE) {
          setLoginStep("password");
          setStatusTone("error");
          setStatus("Unable to verify that password reset link. Request a new one.");
          return;
        }

        setStatus("");
      } catch (error) {
        if (cancelled) {
          return;
        }
        setStatusTone("error");
        setStatus(
          describeAuthError(
            error,
            callbackMode === RECOVERY_MODE
              ? "Unable to complete password reset."
              : "Unable to initialize auth session."
          )
        );
      } finally {
        if (!cancelled) {
          setIsBootstrappingSession(false);
        }
      }
    }

    void bootstrapSession();
    return () => {
      cancelled = true;
    };
  }, [
    supabase,
    logoutRequested,
    requestedReturnTo,
    callbackCode,
    callbackTokenHash,
    callbackType,
    callbackMode,
    callbackError
  ]);

  function getActiveSupabaseClient() {
    if (supabase) {
      return supabase;
    }

    try {
      const client = getSupabaseBrowserClient();
      setSupabase(client);
      return client;
    } catch (error) {
      setStatusTone("error");
      setStatus(describeAuthError(error, "Unable to initialize Supabase client."));
      return null;
    }
  }

  async function handleEmailContinue(event) {
    event.preventDefault();

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setStatusTone("error");
      setStatus("Enter your email to continue.");
      return;
    }

    setIsSubmitting(true);
    setStatusTone("info");
    setStatus("Checking your account...");
    try {
      const nextStep = await startHostedLogin(trimmedEmail, requestedReturnTo);
      if (nextStep === "password") {
        setPassword("");
        setShowPassword(false);
        setLoginStep("password");
        setStatus("");
        return;
      }

      if (nextStep === "noAccount") {
        setLoginStep("noAccount");
        setStatus("");
        return;
      }

      setLoginStep("notice");
      setStatus("");
    } catch (error) {
      setStatusTone("error");
      setStatus(describeAuthError(error, "Unable to continue sign in."));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handlePasswordSignIn(event) {
    event.preventDefault();
    const activeSupabase = getActiveSupabaseClient();
    if (!activeSupabase) {
      return;
    }

    setIsSubmitting(true);
    setStatusTone("info");
    setStatus("Signing in...");
    try {
      const { data, error } = await activeSupabase.auth.signInWithPassword({
        email: email.trim(),
        password
      });
      if (error) {
        throw error;
      }

      const session =
        data.session ??
        (
          await activeSupabase.auth.getSession()
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
      setIsSubmitting(false);
    }
  }

  async function handleForgotPassword(event) {
    event.preventDefault();
    const activeSupabase = getActiveSupabaseClient();
    if (!activeSupabase) {
      return;
    }

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setStatusTone("error");
      setStatus("Enter your email first to receive a reset link.");
      return;
    }

    setIsSubmitting(true);
    setStatusTone("info");
    setStatus("Sending password reset email...");
    try {
      const redirectTo = buildHostedRecoveryRedirectUrl(requestedReturnTo);
      const { error } = await activeSupabase.auth.resetPasswordForEmail(trimmedEmail, redirectTo ? { redirectTo } : undefined);
      if (error) {
        throw error;
      }
      setStatus("Password reset email sent.");
    } catch (error) {
      setStatusTone("error");
      setStatus(describeAuthError(error, "Unable to send password reset email."));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleResetPassword(event) {
    event.preventDefault();
    const activeSupabase = getActiveSupabaseClient();
    if (!activeSupabase) {
      return;
    }

    if (password !== confirmPassword) {
      setStatusTone("error");
      setStatus("Passwords do not match.");
      return;
    }

    if (password.length < PASSWORD_MIN_LENGTH) {
      setStatusTone("error");
      setStatus(`Password must be at least ${PASSWORD_MIN_LENGTH} characters.`);
      return;
    }

    setIsSubmitting(true);
    setStatusTone("info");
    setStatus("Updating password...");

    try {
      const { error } = await activeSupabase.auth.updateUser({
        password
      });
      if (error) {
        throw error;
      }

      const {
        data: { session }
      } = await activeSupabase.auth.getSession();
      if (!session) {
        throw new Error("Password updated but no session was returned.");
      }

      replaceLoginUrl({ requestedReturnTo });
      setStatus("Establishing shared cookies...");
      const sessionPayload = await bootstrapPlatformCookieSession(session);
      const target = resolveRedirectTarget({ sessionPayload, session });
      setStatus(`Password updated. Redirecting to ${target.label}...`);
      window.location.replace(target.url);
    } catch (error) {
      setStatusTone("error");
      setStatus(describeAuthError(error, "Unable to update password."));
      setIsSubmitting(false);
    }
  }

  async function handleUseDifferentEmail() {
    if (loginStep === "resetPassword") {
      const activeSupabase = getActiveSupabaseClient();
      if (activeSupabase) {
        await activeSupabase.auth.signOut().catch(() => null);
      }
      await clearPlatformCookieSession().catch(() => null);
    }

    replaceLoginUrl({ requestedReturnTo });
    setPassword("");
    setConfirmPassword("");
    setShowPassword(false);
    setShowConfirmPassword(false);
    setLoginStep("email");
    setStatus("");
    setStatusTone("info");
  }

  return (
    <main className="login-shell" aria-busy={isBootstrappingSession || isSubmitting}>
      <a href={aveyoAppUrl} className="login-brand-link" aria-label="Go to Aveyo">
        <img src="/aveyo-logo.svg" alt="Aveyo" className="login-brand" />
      </a>

      <section className="login-frame">
        <div className="login-visual" aria-hidden="true" />

        <section className="login-panel">
          <h1 className="login-title">{panelCopy.title}</h1>
          <p className="login-subtitle">{panelCopy.subtitle}</p>

          {loginStep === "email" ? (
            <form onSubmit={handleEmailContinue} className="login-form">
              <label className="login-field">
                <span>Your email</span>
                <input
                  type="email"
                  placeholder="name@email.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  autoComplete="email"
                  required
                  disabled={isSubmitting}
                />
              </label>

              <button type="submit" className="login-primary-button" disabled={isSubmitting}>
                Continue
              </button>
            </form>
          ) : null}

          {loginStep === "password" ? (
            <form onSubmit={handlePasswordSignIn} className="login-form">
              <div className="login-chip" aria-label="Email address">
                {email}
              </div>

              <PasswordField
                label="Password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="••••••••••••••"
                autoComplete="current-password"
                showValue={showPassword}
                onToggle={() => setShowPassword((current) => !current)}
                toggleLabel={showPassword ? "Hide password" : "Show password"}
                disabled={isSubmitting}
              />

              <button type="submit" className="login-primary-button" disabled={isSubmitting}>
                Sign in
              </button>

              <div className="login-actions">
                <button
                  type="button"
                  className="login-secondary-button"
                  onClick={() => {
                    void handleUseDifferentEmail();
                  }}
                  disabled={isSubmitting}
                >
                  Use a different email
                </button>
                <button
                  type="button"
                  className="login-forgot-button"
                  onClick={(event) => {
                    void handleForgotPassword(event);
                  }}
                  disabled={isSubmitting}
                >
                  Forgot password?
                </button>
              </div>
            </form>
          ) : null}

          {loginStep === "notice" ? (
            <div className="login-form">
              <div className="login-notice-banner" role="status" aria-live="polite">
                <span className="login-notice-banner-icon" aria-hidden="true">
                  ✓
                </span>
                <span>Secure sign-in link sent</span>
              </div>
              <div className="login-chip" aria-label="Email address">
                {email}
              </div>
              <p className="login-note">
                If this email is in our active customer-project records, the link will be delivered to this inbox.
                Check spam or promotions if you do not see it within a few minutes.
              </p>
              <button
                type="button"
                className="login-primary-button"
                onClick={() => {
                  void handleUseDifferentEmail();
                }}
                disabled={isSubmitting}
              >
                Use a different email
              </button>
            </div>
          ) : null}

          {loginStep === "noAccount" ? (
            <div className="login-form">
              <div className="login-chip" aria-label="Email address">
                {email}
              </div>
              <button
                type="button"
                className="login-primary-button"
                onClick={() => {
                  void handleUseDifferentEmail();
                }}
                disabled={isSubmitting}
              >
                Try a different email
              </button>
            </div>
          ) : null}

          {loginStep === "resetPassword" ? (
            <form onSubmit={handleResetPassword} className="login-form">
              <div className="login-chip" aria-label="Email address">
                {email}
              </div>

              <PasswordField
                label="New password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Create a new password"
                autoComplete="new-password"
                showValue={showPassword}
                onToggle={() => setShowPassword((current) => !current)}
                toggleLabel={showPassword ? "Hide new password" : "Show new password"}
                disabled={isSubmitting}
              />

              <PasswordField
                label="Confirm password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="Re-enter your password"
                autoComplete="new-password"
                showValue={showConfirmPassword}
                onToggle={() => setShowConfirmPassword((current) => !current)}
                toggleLabel={showConfirmPassword ? "Hide password confirmation" : "Show password confirmation"}
                disabled={isSubmitting}
              />

              <button type="submit" className="login-primary-button" disabled={isSubmitting}>
                Save password
              </button>

              <button
                type="button"
                className="login-secondary-button"
                onClick={() => {
                  void handleUseDifferentEmail();
                }}
                disabled={isSubmitting}
              >
                Cancel
              </button>
            </form>
          ) : null}

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
