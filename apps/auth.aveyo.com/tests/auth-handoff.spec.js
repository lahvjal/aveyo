import { expect, test } from "@playwright/test";

const authBaseUrl = process.env.E2E_AUTH_BASE_URL ?? "http://localhost:4003";
const employeeEmail = process.env.E2E_AUTH_EMAIL ?? "";
const employeePassword = process.env.E2E_AUTH_PASSWORD ?? "";
const localhostMarketingUrl = process.env.E2E_RETURN_TO_URL ?? "http://localhost:4007/";
const protectedAppUrl = process.env.E2E_PROTECTED_APP_URL ?? "http://localhost:4001/";
const defaultEmployeeUrl = process.env.E2E_DEFAULT_EMPLOYEE_URL ?? "http://localhost:4004/";
const customerMagicLinkUrl = process.env.E2E_CUSTOMER_MAGIC_LINK_URL ?? "";
const expectedCustomerUrl = process.env.E2E_CUSTOMER_RETURN_TO_URL ?? "http://localhost:4008/";

function hasEmployeeCredentials() {
  return Boolean(employeeEmail && employeePassword);
}

function buildHostedLoginUrl(returnTo, options = {}) {
  const url = new URL("/login", authBaseUrl);
  url.searchParams.set("returnTo", returnTo);
  if (options.logout) {
    url.searchParams.set("logout", "1");
  }
  return url.toString();
}

async function completePasswordLogin(page, returnTo, options = {}) {
  await page.context().clearCookies();
  await page.goto(buildHostedLoginUrl(returnTo, options));
  await page.getByPlaceholder("name@email.com").fill(employeeEmail);
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByPlaceholder("••••••••••••••").fill(employeePassword);
  await page.getByRole("button", { name: "Sign in" }).click();
}

test("employee password login ignores requested returnTo and lands in the employee app", async ({ page }) => {
  test.skip(!hasEmployeeCredentials(), "requires E2E_AUTH_EMAIL and E2E_AUTH_PASSWORD");

  const sessionRead = page.waitForResponse(
    (response) =>
      response.url().includes("/api/auth/session") &&
      response.status() === 200 &&
      response.request().method() === "GET",
    { timeout: 45_000 }
  );

  await completePasswordLogin(page, localhostMarketingUrl, { logout: true });
  await page.waitForURL((url) => url.toString().startsWith(defaultEmployeeUrl), {
    timeout: 45_000
  });
  await sessionRead;

  expect(page.url().startsWith(defaultEmployeeUrl)).toBe(true);
});

test("direct navigation into a protected app route reaches hosted login first, then lands in the employee app", async ({ page }) => {
  test.skip(!hasEmployeeCredentials(), "requires E2E_AUTH_EMAIL and E2E_AUTH_PASSWORD");

  await page.context().clearCookies();
  await page.goto(protectedAppUrl);
  await page.waitForURL(
    (url) => url.origin === new URL(authBaseUrl).origin && url.pathname === "/login",
    { timeout: 30_000 }
  );

  await page.getByPlaceholder("name@email.com").fill(employeeEmail);
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByPlaceholder("••••••••••••••").fill(employeePassword);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL((url) => url.toString().startsWith(defaultEmployeeUrl), {
    timeout: 45_000
  });

  expect(page.url().startsWith(defaultEmployeeUrl)).toBe(true);
});

test("untrusted returnTo falls back to the default employee destination", async ({ page }) => {
  test.skip(!hasEmployeeCredentials(), "requires E2E_AUTH_EMAIL and E2E_AUTH_PASSWORD");

  await completePasswordLogin(page, "https://evil.example.com/steal", { logout: true });
  await page.waitForURL((url) => url.toString().startsWith(defaultEmployeeUrl), {
    timeout: 45_000
  });

  expect(page.url().startsWith("https://evil.example.com")).toBe(false);
});

test("customer magic-link entry can be verified with a live link", async ({ page }) => {
  test.skip(!customerMagicLinkUrl, "requires E2E_CUSTOMER_MAGIC_LINK_URL");

  await page.context().clearCookies();
  await page.goto(customerMagicLinkUrl);
  await page.waitForURL((url) => url.toString().startsWith(expectedCustomerUrl), {
    timeout: 60_000
  });

  expect(page.url().startsWith(expectedCustomerUrl)).toBe(true);
});
