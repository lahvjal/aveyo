import { afterEach, describe, expect, it } from "vitest";
import { extractAuthTokensFromRequest } from "@/lib/auth/token";

const originalSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

function createAccessToken(projectRef: string) {
  const payload = Buffer.from(JSON.stringify({ ref: projectRef })).toString("base64url");
  return `header.${payload}.signature`;
}

describe("extractAuthTokensFromRequest", () => {
  afterEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = originalSupabaseUrl;
  });

  it("retains the refresh token and reports project mismatch diagnostics", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://expected-project.supabase.co";
    const mismatchedAccessToken = createAccessToken("different-project");
    const request = new Request("http://localhost/api/auth/session", {
      headers: {
        cookie: `ava-access-token=${encodeURIComponent(mismatchedAccessToken)}; ava-refresh-token=refresh-123`
      }
    });

    const result = extractAuthTokensFromRequest(request);

    expect(result.accessToken).toBeUndefined();
    expect(result.refreshToken).toBe("refresh-123");
    expect(result.failureReason).toBe("project_ref_mismatch");
    expect(result.expectedProjectRef).toBe("expected-project");
    expect(result.actualProjectRef).toBe("different-project");
  });

  it("reports a missing access token when only a refresh token is present", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://expected-project.supabase.co";
    const request = new Request("http://localhost/api/auth/session", {
      headers: {
        cookie: "ava-refresh-token=refresh-456"
      }
    });

    const result = extractAuthTokensFromRequest(request);

    expect(result.accessToken).toBeUndefined();
    expect(result.refreshToken).toBe("refresh-456");
    expect(result.failureReason).toBe("missing_access_token");
  });
});
