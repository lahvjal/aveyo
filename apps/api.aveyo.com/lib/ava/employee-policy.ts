import type { SessionAccessContext } from "@/lib/auth/types";

export type EmployeeKpiAccessScope = "none" | "department" | "organization";

export interface EmployeeKnowledgePolicy {
  isEmployee: boolean;
  canAccessDirectory: boolean;
  canAccessNews: boolean;
  kpiScope: EmployeeKpiAccessScope;
  kpiDepartmentIds: string[];
  kpiScopeLabel: string | null;
}

export function resolveEmployeeKnowledgePolicy(
  access: SessionAccessContext
): EmployeeKnowledgePolicy {
  if (access.userType !== "employee") {
    return {
      isEmployee: false,
      canAccessDirectory: false,
      canAccessNews: false,
      kpiScope: "none",
      kpiDepartmentIds: [],
      kpiScopeLabel: null
    };
  }

  if (access.isSuperAdmin || access.isAdmin || access.isExecutive) {
    return {
      isEmployee: true,
      canAccessDirectory: true,
      canAccessNews: true,
      kpiScope: "organization",
      kpiDepartmentIds: [],
      kpiScopeLabel: "organization-wide"
    };
  }

  if (access.isManager && access.departmentId) {
    return {
      isEmployee: true,
      canAccessDirectory: true,
      canAccessNews: true,
      kpiScope: "department",
      kpiDepartmentIds: [access.departmentId, ...access.subDepartmentIds],
      kpiScopeLabel: access.departmentName ?? "their department tree"
    };
  }

  return {
    isEmployee: true,
    canAccessDirectory: true,
    canAccessNews: true,
    kpiScope: "none",
    kpiDepartmentIds: [],
    kpiScopeLabel: null
  };
}
