import { describe, expect, it } from "vitest";
import {
  buildMarketingSitePhotoSlotKey,
  canManageMarketingSitePhotos
} from "@/lib/marketing/site-photos";
import type { AuthSessionResult } from "@/lib/auth/types";

function buildSession(overrides: Partial<AuthSessionResult> = {}): AuthSessionResult {
  return {
    authenticated: true,
    role: "support_agent",
    userType: "employee",
    user: {
      id: "user-1",
      email: "marketing@example.com",
      name: "Marketing User",
      avatarUrl: null
    },
    access: {
      userType: "employee",
      departmentId: "dept-1",
      departmentName: "Marketing",
      departmentPath: [{ id: "dept-1", name: "Marketing", parentId: null }],
      subDepartments: [],
      subDepartmentIds: [],
      isManager: false,
      isAdmin: false,
      isExecutive: false,
      isSuperAdmin: false
    },
    ...overrides
  };
}

describe("buildMarketingSitePhotoSlotKey", () => {
  it("normalizes local image paths into stable slot keys", () => {
    expect(buildMarketingSitePhotoSlotKey("/images/web_photos/hero.jpg")).toBe(
      "images-web-photos-hero-jpg"
    );
  });

  it("strips hostnames from absolute URLs", () => {
    expect(buildMarketingSitePhotoSlotKey("https://cdn.example.com/images/hero.png")).toBe(
      "images-hero-png"
    );
  });
});

describe("canManageMarketingSitePhotos", () => {
  it("allows marketing department employees", () => {
    expect(canManageMarketingSitePhotos(buildSession())).toBe(true);
  });

  it("allows admins outside marketing", () => {
    expect(
      canManageMarketingSitePhotos(
        buildSession({
          access: {
            ...buildSession().access,
            departmentName: "Sales",
            departmentPath: [{ id: "dept-2", name: "Sales", parentId: null }],
            isAdmin: true
          }
        })
      )
    ).toBe(true);
  });

  it("denies non-marketing employees without admin access", () => {
    expect(
      canManageMarketingSitePhotos(
        buildSession({
          access: {
            ...buildSession().access,
            departmentName: "Sales",
            departmentPath: [{ id: "dept-2", name: "Sales", parentId: null }]
          }
        })
      )
    ).toBe(false);
  });

  it("denies unauthenticated users", () => {
    expect(
      canManageMarketingSitePhotos(
        buildSession({
          authenticated: false,
          userType: "unknown",
          user: null
        })
      )
    ).toBe(false);
  });
});
