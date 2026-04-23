import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { proxy } from "@/proxy";
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

describe("api proxy", () => {
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
});
