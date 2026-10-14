import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthSessionResult } from "@/lib/auth/types";
import { uploadMarketingNewsImage } from "@/lib/marketing/news-images";

const { upload, getPublicUrl, from, getClient } = vi.hoisted(() => ({
  upload: vi.fn(),
  getPublicUrl: vi.fn(),
  from: vi.fn(),
  getClient: vi.fn()
}));

vi.mock("@/lib/supabase/server", () => ({ getSupabaseServiceRoleClient: getClient }));

const session: AuthSessionResult = {
  authenticated: true,
  role: "unknown",
  userType: "employee",
  user: { id: "employee-1", email: "employee@aveyo.com", name: "Employee", avatarUrl: null },
  access: {
    userType: "employee", departmentId: null, departmentName: null, departmentPath: [],
    subDepartments: [], subDepartmentIds: [], isManager: false, isAdmin: false,
    isExecutive: false, isSuperAdmin: false
  }
};

function imagePayload(size = 500 * 1024, type = "image/webp") {
  const payload = new FormData();
  payload.append("file", new File([new Uint8Array(size)], "image.webp", { type }));
  return payload;
}

beforeEach(() => {
  getClient.mockReturnValue({ storage: { from } });
  from.mockReturnValue({ upload, getPublicUrl });
  upload.mockResolvedValue({ error: null });
  getPublicUrl.mockImplementation((path: string) => ({
    data: { publicUrl: `https://storage.example.com/${path}` }
  }));
});

describe("news image uploads", () => {
  it.each([
    [false, "unknown", 401],
    [true, "customer", 403]
  ] as const)("rejects unauthorized sessions (%s, %s)", async (authenticated, userType, status) => {
    await expect(uploadMarketingNewsImage(imagePayload(), {
      ...session, authenticated, userType
    })).rejects.toMatchObject({ status });
    expect(getClient).not.toHaveBeenCalled();
  });

  it("rejects missing and empty files before accessing storage", async () => {
    for (const payload of [new FormData(), imagePayload(0)]) {
      await expect(uploadMarketingNewsImage(payload, session)).rejects.toMatchObject({ status: 400 });
    }
    expect(getClient).not.toHaveBeenCalled();
  });

  it("rejects unsupported formats", async () => {
    await expect(uploadMarketingNewsImage(imagePayload(100, "image/svg+xml"), session))
      .rejects.toMatchObject({ status: 400 });
    expect(getClient).not.toHaveBeenCalled();
  });

  it("rejects images one byte over 500 KB", async () => {
    await expect(uploadMarketingNewsImage(imagePayload(500 * 1024 + 1), session))
      .rejects.toMatchObject({ status: 413 });
    expect(getClient).not.toHaveBeenCalled();
  });

  it.each([
    ["image/jpeg", "jpg"], ["image/png", "png"], ["image/webp", "webp"], ["image/avif", "avif"]
  ])("stores a %s image at the size limit using a unique path", async (type, extension) => {
    const result = await uploadMarketingNewsImage(imagePayload(500 * 1024, type), session);
    const [path, bytes, options] = upload.mock.calls[0];
    expect(from).toHaveBeenCalledWith("marketing-site-media");
    expect(path).toMatch(new RegExp(`^news/[a-f0-9-]+\\.${extension}$`));
    expect(bytes).toBeInstanceOf(Uint8Array);
    expect(bytes.byteLength).toBe(500 * 1024);
    expect(options).toMatchObject({ contentType: type, upsert: false });
    expect(result).toEqual({ url: `https://storage.example.com/${path}`, size: 500 * 1024, name: "image.webp" });

    await uploadMarketingNewsImage(imagePayload(100, type), session);
    expect(upload.mock.calls[1][0]).not.toBe(path);
  });

  it("reports storage failures without returning a broken image URL", async () => {
    upload.mockResolvedValue({ error: { message: "Storage unavailable" } });
    await expect(uploadMarketingNewsImage(imagePayload(), session)).rejects.toMatchObject({ status: 500 });
    expect(getPublicUrl).not.toHaveBeenCalled();
  });
});
