import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  timeout: 90_000,
  expect: {
    timeout: 15_000
  },
  use: {
    baseURL: process.env.E2E_AUTH_BASE_URL ?? "http://localhost:4003",
    headless: true,
    trace: "retain-on-failure"
  }
});
