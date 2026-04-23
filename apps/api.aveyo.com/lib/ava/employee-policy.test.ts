import { describe, expect, it } from "vitest";
import type { SessionAccessContext } from "@/lib/auth/types";
import { resolveEmployeeKnowledgePolicy } from "@/lib/ava/employee-policy";

function createAccessContext(
  overrides: Partial<SessionAccessContext> = {}
): SessionAccessContext {
  return {
    userType: "employee",
    departmentId: "dept-sales",
    departmentName: "Sales",
    departmentPath: [],
    subDepartments: [],
    subDepartmentIds: ["dept-east"],
    isManager: false,
    isAdmin: false,
    isExecutive: false,
    isSuperAdmin: false,
    ...overrides
  };
}

describe("resolveEmployeeKnowledgePolicy", () => {
  it("grants safe directory and news access to all employees", () => {
    const policy = resolveEmployeeKnowledgePolicy(createAccessContext());

    expect(policy.isEmployee).toBe(true);
    expect(policy.canAccessDirectory).toBe(true);
    expect(policy.canAccessNews).toBe(true);
    expect(policy.kpiScope).toBe("none");
  });

  it("grants department-scoped KPI access to managers", () => {
    const policy = resolveEmployeeKnowledgePolicy(
      createAccessContext({
        isManager: true
      })
    );

    expect(policy.kpiScope).toBe("department");
    expect(policy.kpiDepartmentIds).toEqual(["dept-sales", "dept-east"]);
    expect(policy.kpiScopeLabel).toBe("Sales");
  });

  it("grants organization-wide KPI access to executives and admins", () => {
    const executivePolicy = resolveEmployeeKnowledgePolicy(
      createAccessContext({
        isExecutive: true
      })
    );
    const adminPolicy = resolveEmployeeKnowledgePolicy(
      createAccessContext({
        isAdmin: true
      })
    );

    expect(executivePolicy.kpiScope).toBe("organization");
    expect(adminPolicy.kpiScope).toBe("organization");
    expect(executivePolicy.kpiScopeLabel).toBe("organization-wide");
    expect(adminPolicy.kpiScopeLabel).toBe("organization-wide");
  });

  it("blocks all internal knowledge for non-employees", () => {
    const policy = resolveEmployeeKnowledgePolicy(
      createAccessContext({
        userType: "customer"
      })
    );

    expect(policy.isEmployee).toBe(false);
    expect(policy.canAccessDirectory).toBe(false);
    expect(policy.canAccessNews).toBe(false);
    expect(policy.kpiScope).toBe("none");
  });
});
