import { beforeEach, describe, expect, it, vi } from "vitest";
import { extractAuthTokensFromRequest } from "@/lib/auth/token";
import { getAuthSessionResultWithOptions } from "@/lib/auth/session";
import { getSupabaseServerClient, getSupabaseServiceRoleClient } from "@/lib/supabase/server";

vi.mock("@/lib/auth/token", () => ({
  extractAuthTokensFromRequest: vi.fn()
}));

vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServerClient: vi.fn(),
  getSupabaseServiceRoleClient: vi.fn()
}));

const mockedExtractAuthTokensFromRequest = vi.mocked(extractAuthTokensFromRequest);
const mockedGetSupabaseServerClient = vi.mocked(getSupabaseServerClient);
const mockedGetSupabaseServiceRoleClient = vi.mocked(getSupabaseServiceRoleClient);

function createAccessToken(role = "support_agent") {
  const payload = Buffer.from(JSON.stringify({ app_role: role })).toString("base64url");
  return `header.${payload}.signature`;
}

function mockResolvedProfile() {
  mockedGetSupabaseServiceRoleClient.mockReturnValue({
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({
            data: null,
            error: null
          })
        })
      })
    }),
    rpc: async () => ({
      data: true,
      error: null
    })
  } as never);
}

describe("getAuthSessionResultWithOptions", () => {
  beforeEach(() => {
    mockedExtractAuthTokensFromRequest.mockReset();
    mockedGetSupabaseServerClient.mockReset();
    mockedGetSupabaseServiceRoleClient.mockReset();
    mockResolvedProfile();
  });

  it("refreshes the session when only a refresh token is present", async () => {
    const accessToken = createAccessToken();
    mockedExtractAuthTokensFromRequest.mockReturnValue({
      refreshToken: "refresh-123",
      failureReason: "missing_access_token"
    });

    const getUser = vi.fn().mockResolvedValue({
      data: {
        user: {
          id: "user-1",
          email: "agent@aveyo.com",
          app_metadata: { role: "support_agent" },
          user_metadata: { full_name: "Agent Ava" }
        }
      },
      error: null
    });
    const refreshSession = vi.fn().mockResolvedValue({
      data: {
        session: {
          access_token: accessToken,
          refresh_token: "refresh-456"
        }
      },
      error: null
    });

    mockedGetSupabaseServerClient.mockReturnValue({
      auth: {
        getUser,
        refreshSession
      }
    } as never);

    const result = await getAuthSessionResultWithOptions(new Request("http://localhost"), {
      allowTokenRefresh: true
    });

    expect(refreshSession).toHaveBeenCalledWith({ refresh_token: "refresh-123" });
    expect(result.authenticated).toBe(true);
    expect(result.user?.email).toBe("agent@aveyo.com");
    expect(result.refreshedTokens).toEqual({
      accessToken,
      refreshToken: "refresh-456"
    });
  });

  it("returns a refresh_failed reason when refresh recovery fails", async () => {
    mockedExtractAuthTokensFromRequest.mockReturnValue({
      refreshToken: "refresh-123",
      failureReason: "missing_access_token"
    });

    mockedGetSupabaseServerClient.mockReturnValue({
      auth: {
        getUser: vi.fn(),
        refreshSession: vi.fn().mockResolvedValue({
          data: { session: null },
          error: { message: "refresh failed" }
        })
      }
    } as never);

    const result = await getAuthSessionResultWithOptions(new Request("http://localhost"), {
      allowTokenRefresh: true
    });

    expect(result.authenticated).toBe(false);
    expect(result.failure?.reason).toBe("refresh_failed");
  });

  it("returns invalid_access_token when the access token cannot be resolved", async () => {
    mockedExtractAuthTokensFromRequest.mockReturnValue({
      accessToken: createAccessToken()
    });

    mockedGetSupabaseServerClient.mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: null },
          error: { message: "invalid token" }
        }),
        refreshSession: vi.fn()
      }
    } as never);

    const result = await getAuthSessionResultWithOptions(new Request("http://localhost"));

    expect(result.authenticated).toBe(false);
    expect(result.failure?.reason).toBe("invalid_access_token");
  });
});
