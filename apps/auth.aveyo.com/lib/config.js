import { getLocalAppUrl, trimTrailingSlash } from "@ava/config/runtime/app-urls";

export function getEmployeeAppUrl() {
  const configured = process.env.NEXT_PUBLIC_AUTH_EMPLOYEE_APP_URL?.trim();
  if (!configured) {
    return "https://app.aveyo.com";
  }

  return trimTrailingSlash(configured);
}

export function getCustomerAppUrl() {
  const configured = process.env.NEXT_PUBLIC_AUTH_CUSTOMER_APP_URL?.trim();
  if (!configured) {
    return "https://customer.aveyo.com";
  }

  return trimTrailingSlash(configured);
}

export function getAuthApiBaseUrl() {
  const configured = process.env.NEXT_PUBLIC_AUTH_API_BASE_URL?.trim();
  if (!configured) {
    return getLocalAppUrl("api");
  }

  return trimTrailingSlash(configured);
}
