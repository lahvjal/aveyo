import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { proxy } from "@/proxy";
import { getAllowedOrigins } from "@/lib/auth/origins";
import { extractAccessTokenFromNextRequest } from "@/lib/auth/token";

vi.mock("@/lib/auth/cookie-contract", () => ({
  getSessionCookieContract: vi.fn()
}));

vi.mock("@/lib/auth/token", () => ({
  extractAccessTokenFromNextRequest: vi.fn()
}));

vi.mock("@/lib/auth/origins", () => ({
  getAllowedOrigins: vi.fn(() => []),
  isAllowedLocalDevOrigin: vi.fn(() => false)
}));

const mockedExtractAccessTokenFromNextRequest = vi.mocked(extractAccessTokenFromNextRequest);
const mockedGetAllowedOrigins = vi.mocked(getAllowedOrigins);

describe("api proxy", () => {
  it("rejects disallowed cross-origin requests before route handling", () => {
    mockedGetAllowedOrigins.mockReturnValue(["https://app.aveyo.com"]);
    mockedExtractAccessTokenFromNextRequest.mockReturnValue("valid-token");

    const response = proxy(
      new NextRequest("https://api.aveyo.com/api/conversations", {
        headers: { origin: "https://attacker.example.com" }
      })
    );

    expect(response.status).toBe(403);
    expect(response.headers.get("access-control-allow-origin")).toBeNull();
    expect(response.headers.get("vary")).toContain("Origin");
  });

  it("allows guest reply requests without an auth token", () => {
    mockedExtractAccessTokenFromNextRequest.mockReturnValue(undefined);

    const response = proxy(new NextRequest("https://api.aveyo.com/api/public/ava/guest-reply"));

    expect(response.status).toBe(200);
    expect(response.headers.get("x-middleware-next")).toBe("1");
  });

  it("still blocks protected API routes without an auth token", () => {
    mockedExtractAccessTokenFromNextRequest.mockReturnValue(undefined);

    const response = proxy(new NextRequest("https://api.aveyo.com/api/conversations"));

    expect(response.status).toBe(401);
    expect(response.headers.get("content-type")).toContain("application/json");
  });

  it("allows internal cron routes without an auth token", () => {
    mockedExtractAccessTokenFromNextRequest.mockReturnValue(undefined);

    const response = proxy(
      new NextRequest("https://api.aveyo.com/api/internal/ava/automation")
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("x-middleware-next")).toBe("1");
  });
});
