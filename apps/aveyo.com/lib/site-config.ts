import { resolveApiBaseUrl } from "@ava/config/runtime/auth-urls";
import { resolveAppUrl } from "@ava/config/runtime/app-urls";

export const AVEYO_ADDRESS = "1261 S 820 E #300, American Fork, UT 84003";
export const AVEYO_INFO_EMAIL = "info@aveyo.com";
export const AVEYO_SALES_PHONE = "(833) 362-8300";
export const AVEYO_CUSTOMER_CARE_PHONE = "(385) 469-3838";
export const AVEYO_SALES_PHONE_HREF = "tel:+18333628300";
export const AVEYO_CUSTOMER_CARE_PHONE_HREF = "tel:+13854693838";
export const AVEYO_INFO_EMAIL_HREF = "mailto:info@aveyo.com";

type SiteEnvironment = "local" | "dev" | "staging" | "prod";

function inferConfiguredEnvironment(value: string | undefined): SiteEnvironment | null {
  const normalized = value?.trim().toLowerCase();
  if (!normalized) {
    return null;
  }

  if (normalized.includes("localhost") || normalized.includes("127.0.0.1")) {
    return "local";
  }
  if (normalized.includes("staging.aveyo.com")) {
    return "staging";
  }
  if (normalized.includes("dev.aveyo.com")) {
    return "dev";
  }
  if (normalized.includes("aveyo.com")) {
    return "prod";
  }

  return null;
}

export function getSiteEnvironment(): SiteEnvironment {
  const configuredEnvironment =
    inferConfiguredEnvironment(process.env.NEXT_PUBLIC_AVEYO_APP_URL) ??
    inferConfiguredEnvironment(process.env.VERCEL_URL);

  if (configuredEnvironment) {
    return configuredEnvironment;
  }

  return process.env.NODE_ENV === "production" ? "prod" : "local";
}

export function getPublicApiBaseUrl() {
  return resolveApiBaseUrl({
    configuredPlatformApiBaseUrl: process.env.NEXT_PUBLIC_PLATFORM_API_BASE_URL,
    configuredAvaApiBaseUrl: process.env.NEXT_PUBLIC_AVA_API_BASE_URL,
    fallbackApiBaseUrl: resolveAppUrl("api", getSiteEnvironment())
  });
}

export function getCustomerPortalUrl() {
  const configuredCustomerAppUrl = process.env.NEXT_PUBLIC_CUSTOMER_APP_URL?.trim();
  if (configuredCustomerAppUrl) {
    return configuredCustomerAppUrl;
  }

  return resolveAppUrl("customer", getSiteEnvironment());
}
