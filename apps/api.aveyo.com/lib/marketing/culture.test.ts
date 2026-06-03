import { describe, expect, it } from "vitest";
import { canManageCulture } from "@/lib/marketing/culture";
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

describe("canManageCulture", () => {
  it("allows marketing department employees", () => {
    expect(canManageCulture(buildSession())).toBe(true);
  });

  it("allows admins outside marketing", () => {
    expect(
      canManageCulture(
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
      canManageCulture(
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
      canManageCulture(
        buildSession({
          authenticated: false,
          userType: "unknown",
          user: null
        })
      )
    ).toBe(false);
  });
});
