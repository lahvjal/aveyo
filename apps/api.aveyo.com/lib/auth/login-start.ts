import { type User } from "@supabase/supabase-js";
import { getLocalAppUrl, resolveAppUrl, resolveEnvironment } from "@ava/config/runtime/app-urls";
import { getMySqlCustomerProjectDetails } from "@/lib/mysql/customer-projects";
import { ServiceError } from "@/lib/service-error";
import { getSupabaseServiceRoleClient } from "@/lib/supabase/server";

const LOCAL_HOST_PATTERN =
  /^(localhost|127(?:\.\d{1,3}){3}|10(?:\.\d{1,3}){3}|172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2}|192\.168(?:\.\d{1,3}){2}|0\.0\.0\.0|::1|.+\.local)$/i;
const DEFAULT_AUTH_FROM_EMAIL = "Aveyo Support <support@send.goaveyo.com>";
const DEFAULT_CUSTOMER_SUPPORT_EMAIL = "customercare@aveyo.com";
const DEFAULT_LOOKUP_CACHE_TTL_MS = 5 * 60 * 1000;

export type LoginStartNextStep = "password" | "emailLinkNotice" | "noAccount";

interface BeginHostedLoginInput {
  email?: unknown;
  returnTo?: unknown;
}

interface EmployeeProfileLookupRow {
  id: string;
  email: string | null;
  employment_status: string | null;
}

interface CachedAuthUserLookup {
  value: User | null;
  expiresAt: number;
}

const authUserLookupCache = new Map<string, CachedAuthUserLookup>();

function normalizeEmailAddress(value: unknown) {
  if (typeof value !== "string") {
    throw new ServiceError(400, "Email is required.");
  }

  const normalized = value.trim().toLowerCase();
  if (!normalized) {
    throw new ServiceError(400, "Email is required.");
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    throw new ServiceError(400, "Enter a valid email address.");
  }

  return normalized;
}

function isActiveEmployee(employmentStatus: string | null | undefined) {
  const normalized = employmentStatus?.trim().toLowerCase();
  return !normalized || normalized === "active";
}

function normalizeConfiguredEmail(value: string | undefined, fallback: string) {
  const configured = typeof value === "string" ? value.trim() : "";
  return configured || fallback;
}

function normalizeHostname(value: string | null) {
  if (!value) {
    return "";
  }

  return value.trim().toLowerCase();
}

function isTrustedAveyoHostname(hostname: string) {
  const normalized = normalizeHostname(hostname);
  if (!normalized) {
    return false;
  }

  return (
    normalized === "aveyo.com" ||
    normalized.endsWith(".aveyo.com") ||
    LOCAL_HOST_PATTERN.test(normalized)
  );
}

function resolveTrustedReturnToUrl(value: unknown) {
  if (typeof value !== "string") {
    return "";
  }

  const raw = value.trim();
  if (!raw) {
    return "";
  }

  try {
    const parsed = new URL(raw);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      return "";
    }
    return isTrustedAveyoHostname(parsed.hostname) ? parsed.toString() : "";
  } catch {
    return "";
  }
}

function resolveAuthAppOriginFromRequest(request: Request) {
  const origin = request.headers.get("origin");
  if (origin) {
    try {
      const parsedOrigin = new URL(origin);
      if (isTrustedAveyoHostname(parsedOrigin.hostname)) {
        return parsedOrigin.origin;
      }
    } catch {
      // Ignore malformed origin headers and fall back below.
    }
  }

  const referer = request.headers.get("referer");
  if (referer) {
    try {
      const parsedReferer = new URL(referer);
      if (isTrustedAveyoHostname(parsedReferer.hostname)) {
        return parsedReferer.origin;
      }
    } catch {
      // Ignore malformed referers and fall back below.
    }
  }

  const environment = resolveEnvironment(request.headers.get("host") ?? "");
  return environment === "local" ? getLocalAppUrl("auth") : resolveAppUrl("auth", environment);
}

function buildHostedAuthCallbackUrl(request: Request, requestedReturnTo: unknown) {
  const authOrigin = resolveAuthAppOriginFromRequest(request);
  const redirectUrl = new URL("/auth/callback", authOrigin);
  const trustedReturnTo = resolveTrustedReturnToUrl(requestedReturnTo);
  if (trustedReturnTo) {
    redirectUrl.searchParams.set("returnTo", trustedReturnTo);
  }
  return redirectUrl.toString();
}

async function resolveEmployeeMatchByEmail(email: string) {
  const supabase = getSupabaseServiceRoleClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, employment_status")
    .ilike("email", email)
    .limit(5);

  if (error) {
    throw new ServiceError(500, "Failed to verify employee account.");
  }

  const rows = (data ?? []) as EmployeeProfileLookupRow[];
  return rows.find((row) => row.id && isActiveEmployee(row.employment_status)) ?? null;
}

function readCachedAuthUser(email: string) {
  const cached = authUserLookupCache.get(email);
  if (!cached) {
    return undefined;
  }

  if (cached.expiresAt <= Date.now()) {
    authUserLookupCache.delete(email);
    return undefined;
  }

  return cached.value;
}

function writeCachedAuthUser(email: string, value: User | null) {
  authUserLookupCache.set(email, {
    value,
    expiresAt: Date.now() + DEFAULT_LOOKUP_CACHE_TTL_MS
  });
}

async function findAuthUserByEmail(email: string) {
  const cached = readCachedAuthUser(email);
  if (cached !== undefined) {
    return cached;
  }

  const supabase = getSupabaseServiceRoleClient();
  const perPage = 1000;
  let page = 1;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) {
      throw new ServiceError(500, "Failed to verify customer account.");
    }

    const users = data?.users ?? [];
    const matchedUser =
      users.find((candidate) => candidate.email?.trim().toLowerCase() === email) ?? null;
    if (matchedUser) {
      writeCachedAuthUser(email, matchedUser);
      return matchedUser;
    }

    if (users.length < perPage) {
      break;
    }

    page += 1;
  }

  writeCachedAuthUser(email, null);
  return null;
}

function buildCustomerMetadata(email: string, customerName: string | null) {
  const displayName = customerName?.trim() || email.split("@")[0] || "Customer";
  return {
    app_metadata: {
      app_role: "customer",
      role: "customer",
      user_type: "customer",
      account_type: "customer"
    },
    user_metadata: {
      full_name: displayName,
      role: "customer",
      user_type: "customer",
      account_type: "customer"
    }
  };
}

async function ensureCustomerAuthUser(email: string, customerName: string | null) {
  const supabase = getSupabaseServiceRoleClient();
  const existingUser = await findAuthUserByEmail(email);
  const metadata = buildCustomerMetadata(email, customerName);

  if (existingUser) {
    const { data, error } = await supabase.auth.admin.updateUserById(existingUser.id, {
      email_confirm: true,
      ...metadata
    });
    if (error) {
      throw new ServiceError(500, "Failed to prepare secure sign-in.");
    }

    writeCachedAuthUser(email, data.user ?? existingUser);
    return data.user ?? existingUser;
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    email_confirm: true,
    ...metadata
  });
  if (error || !data.user) {
    throw new ServiceError(500, "Failed to prepare secure sign-in.");
  }

  writeCachedAuthUser(email, data.user);
  return data.user;
}

async function generateCustomerMagicLink(request: Request, email: string, requestedReturnTo: unknown) {
  const supabase = getSupabaseServiceRoleClient();
  const redirectTo = buildHostedAuthCallbackUrl(request, requestedReturnTo);
  const { data, error } = await supabase.auth.admin.generateLink({
    type: "magiclink",
    email,
    options: {
      redirectTo
    }
  });

  const actionLink = data?.properties?.action_link?.trim();
  if (error || !actionLink) {
    throw new ServiceError(500, "Failed to generate secure sign-in link.");
  }

  return actionLink;
}

async function sendCustomerSignInEmailViaSupabase(request: Request, email: string, requestedReturnTo: unknown) {
  const supabase = getSupabaseServiceRoleClient();
  const emailRedirectTo = buildHostedAuthCallbackUrl(request, requestedReturnTo);
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo,
      shouldCreateUser: false
    }
  });

  if (error) {
    throw new ServiceError(500, "Failed to send secure sign-in email.");
  }
}

async function sendCustomerSignInEmail(email: string, actionLink: string) {
  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey) {
    throw new ServiceError(500, "Email service configuration is missing.");
  }

  const fromEmail = normalizeConfiguredEmail(
    process.env.AVA_CUSTOMER_AUTH_FROM_EMAIL,
    DEFAULT_AUTH_FROM_EMAIL
  );
  const supportEmail = normalizeConfiguredEmail(
    process.env.AVA_CUSTOMER_AUTH_SUPPORT_EMAIL,
    DEFAULT_CUSTOMER_SUPPORT_EMAIL
  );

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from: fromEmail,
      to: [email],
      subject: "Your secure Aveyo sign-in link",
      html: `
        <!DOCTYPE html>
        <html>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #1f2937; margin: 0; padding: 24px; background: #f9fafb;">
            <div style="max-width: 560px; margin: 0 auto; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 16px; overflow: hidden;">
              <div style="padding: 24px 24px 16px; background: #111827; color: #ffffff;">
                <h1 style="margin: 0; font-size: 24px; line-height: 1.2;">Secure sign-in link</h1>
              </div>
              <div style="padding: 24px;">
                <p style="margin-top: 0;">Use the button below to sign in to your Aveyo Customer Portal.</p>
                <p>This secure link is for the email address it was sent to and should be opened on this device.</p>
                <p style="margin: 28px 0; text-align: center;">
                  <a href="${actionLink}" style="display: inline-block; padding: 12px 20px; background: #111827; color: #ffffff; text-decoration: none; border-radius: 10px; font-weight: 700;">
                    Sign in securely
                  </a>
                </p>
                <p>If the button does not work, copy and paste this link into your browser:</p>
                <p style="word-break: break-all; font-size: 13px; color: #4b5563;">${actionLink}</p>
                <p style="margin-bottom: 0;">If you need help, contact <a href="mailto:${supportEmail}">${supportEmail}</a>.</p>
              </div>
            </div>
          </body>
        </html>
      `
    })
  });

  if (!response.ok) {
    const errorPayload = await response.text().catch(() => "");
    console.error("Failed to send customer sign-in email", {
      status: response.status,
      body: errorPayload
    });
    throw new ServiceError(500, "Failed to send secure sign-in email.");
  }
}

export async function beginHostedLogin(request: Request, input: BeginHostedLoginInput) {
  const email = normalizeEmailAddress(input.email);

  const employeeMatch = await resolveEmployeeMatchByEmail(email);
  if (employeeMatch) {
    return {
      email,
      nextStep: "password" as const
    };
  }

  const customerMatch = await getMySqlCustomerProjectDetails({ email });
  if (!customerMatch) {
    return {
      email,
      nextStep: "noAccount" as const
    };
  }

  await ensureCustomerAuthUser(email, customerMatch.customerName);
  const resendApiKey = process.env.RESEND_API_KEY?.trim();
  if (!resendApiKey) {
    await sendCustomerSignInEmailViaSupabase(request, email, input.returnTo);
    return {
      email,
      nextStep: "emailLinkNotice" as const
    };
  }

  try {
    const actionLink = await generateCustomerMagicLink(request, email, input.returnTo);
    await sendCustomerSignInEmail(email, actionLink);
  } catch (error) {
    console.error("Customer magic-link email fallback triggered", error);
    await sendCustomerSignInEmailViaSupabase(request, email, input.returnTo);
  }

  return {
    email,
    nextStep: "emailLinkNotice" as const
  };
}
