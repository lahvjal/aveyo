import { describe, expect, it } from "vitest";
import { resolveAppUrl } from "@ava/config/runtime/app-urls";
import { getAllowedOrigins, getDefaultAllowedOrigins, isAllowedLocalDevOrigin } from "@/lib/auth/origins";

describe("auth origins", () => {
  it("derives default origins from the shared app registry", () => {
    const origins = getDefaultAllowedOrigins();

    expect(origins).toContain("http://localhost:4001");
    expect(origins).toContain("http://localhost:4009");
    expect(origins).toContain("https://auth.aveyo.com");
    expect(origins).toContain("https://app.aveyo.com");
    expect(origins).toContain("https://www.aveyo.com");
  });

  it("merges configured origins with the generated defaults", () => {
    const origins = getAllowedOrigins("https://partners.example.com, https://portal.example.com");

    expect(origins).toContain("https://partners.example.com");
    expect(origins).toContain("https://portal.example.com");
    expect(origins).toContain("https://auth.aveyo.com");
  });

  it("accepts local network and localhost origins in non-production", () => {
    expect(isAllowedLocalDevOrigin("http://localhost:4007")).toBe(true);
    expect(isAllowedLocalDevOrigin("http://192.168.1.20:4007")).toBe(true);
    expect(isAllowedLocalDevOrigin("https://preview.example.com")).toBe(false);
  });

  it("keeps KPI production auth authority on auth.aveyo.com", () => {
    expect(resolveAppUrl("kpi", "prod")).toBe("https://kpi.aveyo.com");
    expect(resolveAppUrl("auth", "prod")).toBe("https://auth.aveyo.com");
    expect(resolveAppUrl("auth", "prod")).not.toContain("auth-staging.aveyo.com");
  });
});
