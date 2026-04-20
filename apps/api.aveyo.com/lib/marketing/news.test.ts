import { describe, expect, it } from "vitest";
import type { AuthSessionResult } from "@/lib/auth/types";
import {
  MarketingNewsError,
  assertEmployeeNewsAccess,
  assertPublishNewsAccess,
  canPublishMarketingNews,
  normalizeNewsSlug,
  resolveMarketingNewsScope
} from "@/lib/marketing/news";

function buildSession(overrides: Partial<AuthSessionResult> = {}): AuthSessionResult {
  return {
    authenticated: true,
    role: "unknown",
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
      email: "employee@aveyo.com",
      name: "Employee One",
      avatarUrl: null
    },
    ...overrides
  };
}

describe("marketing news helpers", () => {
  it("normalizes slugs from mixed-case marketing headlines", () => {
    expect(normalizeNewsSlug("We're Launching AVA, Our AI Chatbot!")).toBe(
      "were-launching-ava-our-ai-chatbot"
    );
    expect(normalizeNewsSlug("  The Big Beautiful Bill  ")).toBe("the-big-beautiful-bill");
  });

  it("keeps public readers in the published scope", () => {
    const anonymousSession = buildSession({
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
      user: null
    });

    expect(resolveMarketingNewsScope(anonymousSession, true)).toBe("published");
    expect(resolveMarketingNewsScope(buildSession(), true)).toBe("all");
  });

  it("only allows admins to publish or delete", () => {
    const employeeSession = buildSession();
    const adminSession = buildSession({
      access: {
        ...buildSession().access,
        isAdmin: true
      }
    });

    expect(canPublishMarketingNews(employeeSession)).toBe(false);
    expect(canPublishMarketingNews(adminSession)).toBe(true);
    expect(() => assertPublishNewsAccess(employeeSession)).toThrowError(MarketingNewsError);
    expect(() => assertPublishNewsAccess(adminSession)).not.toThrow();
  });

  it("requires an authenticated employee session to manage drafts", () => {
    const customerSession = buildSession({
      role: "customer",
      userType: "customer",
      access: {
        ...buildSession().access,
        userType: "customer"
      }
    });

    expect(() => assertEmployeeNewsAccess(customerSession)).toThrowError(MarketingNewsError);
  });
});
