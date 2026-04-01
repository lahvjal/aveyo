import { beforeEach, describe, expect, it, vi } from "vitest";
import { resolveRoleWithProfileFlags } from "@/lib/auth/session";
import { getSupabaseServiceRoleClient } from "@/lib/supabase/server";

vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServerClient: vi.fn(),
  getSupabaseServiceRoleClient: vi.fn()
}));

const mockedGetSupabaseServiceRoleClient = vi.mocked(getSupabaseServiceRoleClient);

function mockRoleResolution(params: {
  profileData?: { is_super_admin: boolean | null; profile_photo_url: string | null } | null;
  profileError?: { message: string } | null;
  supportData?: boolean;
  supportError?: { message: string } | null;
}) {
  mockedGetSupabaseServiceRoleClient.mockReturnValue({
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({
            data: params.profileData ?? null,
            error: params.profileError ?? null
          })
        })
      })
    }),
    rpc: async () => ({
      data: params.supportData ?? false,
      error: params.supportError ?? null
    })
  } as never);
}

describe("resolveRoleWithProfileFlags", () => {
  beforeEach(() => {
    mockedGetSupabaseServiceRoleClient.mockReset();
  });

  it("returns super_admin when profile flag is set", async () => {
    mockRoleResolution({
      profileData: { is_super_admin: true, profile_photo_url: "https://cdn/avatar.png" },
      supportData: true
    });

    const result = await resolveRoleWithProfileFlags("user-1", "unknown");
    expect(result.role).toBe("super_admin");
    expect(result.avatarUrl).toBe("https://cdn/avatar.png");
  });

  it("returns support_agent when support RPC returns true", async () => {
    mockRoleResolution({
      profileData: { is_super_admin: false, profile_photo_url: null },
      supportData: true
    });

    const result = await resolveRoleWithProfileFlags("user-1", "unknown");
    expect(result.role).toBe("support_agent");
  });

  it("preserves customer fallback when support RPC is false", async () => {
    mockRoleResolution({
      profileData: { is_super_admin: false, profile_photo_url: null },
      supportData: false
    });

    const result = await resolveRoleWithProfileFlags("user-1", "customer");
    expect(result.role).toBe("customer");
  });

  it("falls back safely when profile lookup fails", async () => {
    mockRoleResolution({
      profileError: { message: "db unavailable" }
    });

    const result = await resolveRoleWithProfileFlags("user-1", "support_agent");
    expect(result.role).toBe("support_agent");
    expect(result.avatarUrl).toBeNull();
  });
});

