import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/auth/session/route";
import { getAuthSessionResultWithOptions } from "@/lib/auth/session";
import { applyAuthSessionCookies } from "@/lib/auth/session-cookies";
import { extractAuthTokensFromRequest } from "@/lib/auth/token";

vi.mock("@/lib/auth/session", () => ({
  getAuthSessionResultWithOptions: vi.fn()
}));

vi.mock("@/lib/auth/session-cookies", () => ({
  applyAuthSessionCookies: vi.fn()
}));

vi.mock("@/lib/auth/token", () => ({
  extractAuthTokensFromRequest: vi.fn()
}));

const mockedGetAuthSessionResultWithOptions = vi.mocked(getAuthSessionResultWithOptions);
const mockedApplyAuthSessionCookies = vi.mocked(applyAuthSessionCookies);
const mockedExtractAuthTokensFromRequest = vi.mocked(extractAuthTokensFromRequest);

describe("auth session route", () => {
  beforeEach(() => {
    mockedGetAuthSessionResultWithOptions.mockReset();
    mockedApplyAuthSessionCookies.mockReset();
    mockedExtractAuthTokensFromRequest.mockReset();
  });

  it("returns authenticated payload and applies refreshed cookies when present", async () => {
    mockedGetAuthSessionResultWithOptions.mockResolvedValue({
      authenticated: true,
      role: "support_agent",
      userType: "employee",
      access: {
        userType: "employee",
        departmentId: null,
        departmentName: null,
        departmentPath: [],
        subDepartments: [],
        subDepartmentIds: [],
        isManager: false,
        isAdmin: false,
        isExecutive: false,
        isSuperAdmin: false
      },
      user: {
        id: "user-1",
        email: "agent@aveyo.com",
        name: "Agent Ava",
        avatarUrl: null
      },
      refreshedTokens: {
        accessToken: "access-123",
        refreshToken: "refresh-123"
      }
    });

    const response = await GET(new Request("http://localhost/api/auth/session"));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.authenticated).toBe(true);
    expect(mockedApplyAuthSessionCookies).toHaveBeenCalledOnce();
  });

  it("does not clear cookies for anonymous unauthenticated reads", async () => {
    mockedGetAuthSessionResultWithOptions.mockResolvedValue({
      authenticated: false,
      role: "unknown",
      userType: "unknown",
      access: {
        userType: "unknown",
        departmentId: null,
        departmentName: null,
        departmentPath: [],
        subDepartments: [],
        subDepartmentIds: [],
        isManager: false,
        isAdmin: false,
        isExecutive: false,
        isSuperAdmin: false
      },
      user: null,
      failure: {
        reason: "missing_access_token"
      }
    });
    mockedExtractAuthTokensFromRequest.mockReturnValue({});

    const response = await GET(new Request("http://localhost/api/auth/session"));
    const payload = await response.json();

    expect(response.status).toBe(401);
    expect(payload.authenticated).toBe(false);
    expect(mockedApplyAuthSessionCookies).not.toHaveBeenCalled();
  });

  it("does not clear or overwrite cookies for stale session 401 responses", async () => {
    mockedGetAuthSessionResultWithOptions.mockResolvedValue({
      authenticated: false,
      role: "unknown",
      userType: "unknown",
      access: {
        userType: "unknown",
        departmentId: null,
        departmentName: null,
        departmentPath: [],
        subDepartments: [],
        subDepartmentIds: [],
        isManager: false,
        isAdmin: false,
        isExecutive: false,
        isSuperAdmin: false
      },
      user: null,
      failure: {
        reason: "refresh_failed"
      }
    });
    mockedExtractAuthTokensFromRequest.mockReturnValue({
      accessToken: "stale-access-token",
      refreshToken: "stale-refresh-token"
    });

    const response = await GET(new Request("http://localhost/api/auth/session"));
    const payload = await response.json();

    expect(response.status).toBe(401);
    expect(payload.authenticated).toBe(false);
    expect(mockedApplyAuthSessionCookies).not.toHaveBeenCalled();
  });
});
