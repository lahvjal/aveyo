const DASHBOARD_TIERS = Object.freeze(["employee", "manager", "admin", "executive", "super_admin"]);

const MODULE_REGISTRY = Object.freeze([
  {
    id: "org_chart",
    title: "Org Chart",
    description: "Access people structure and reporting lines.",
    visibility: { minimumTier: "employee" }
  },
  {
    id: "platform_operations",
    title: "Platform Operations",
    description: "Run shared platform and rollout commands.",
    visibility: { minimumTier: "employee" }
  },
  {
    id: "department_scope",
    title: "Department Focus",
    description: "Your assigned department and inherited scope.",
    visibility: { minimumTier: "employee", requireDepartment: true }
  },
  {
    id: "sub_department_scope",
    title: "Sub-Department Focus",
    description: "Downline departments included in your scope.",
    visibility: { minimumTier: "employee", requireSubDepartments: true }
  },
  {
    id: "manager_workspace",
    title: "Manager Workspace",
    description: "Team operations and staffing priorities.",
    visibility: {
      minimumTier: "manager",
      requireAnyFlags: ["isManager", "isAdmin", "isExecutive", "isSuperAdmin"]
    }
  },
  {
    id: "admin_workspace",
    title: "Admin Workspace",
    description: "User governance, departments, and permissions.",
    visibility: {
      minimumTier: "admin",
      requireAnyFlags: ["isAdmin", "isSuperAdmin"]
    }
  },
  {
    id: "executive_workspace",
    title: "Executive Workspace",
    description: "Cross-org KPI pulse and performance trends.",
    visibility: {
      minimumTier: "executive",
      requireAnyFlags: ["isExecutive", "isSuperAdmin"]
    }
  },
  {
    id: "super_admin_workspace",
    title: "Super Admin Workspace",
    description: "Environment controls, release windows, and platform guardrails.",
    visibility: {
      minimumTier: "super_admin",
      requireAllFlags: ["isSuperAdmin"]
    }
  },
  {
    id: "announcements",
    title: "Company Announcements",
    description: "Operational and company updates.",
    visibility: { minimumTier: "employee" }
  },
  {
    id: "upcoming_events",
    title: "Upcoming Events",
    description: "Near-term meetings and platform milestones.",
    visibility: { minimumTier: "employee" }
  }
]);

function normalizeDepartmentNode(node) {
  if (!node || typeof node !== "object") {
    return null;
  }

  const id = typeof node.id === "string" ? node.id.trim() : "";
  if (!id) {
    return null;
  }

  return {
    id,
    name: typeof node.name === "string" ? node.name.trim() : id,
    parentId: typeof node.parentId === "string" ? node.parentId.trim() : null
  };
}

function normalizeAccessContext(access) {
  if (!access || typeof access !== "object") {
    return {
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
    };
  }

  const departmentPath = Array.isArray(access.departmentPath)
    ? access.departmentPath.map(normalizeDepartmentNode).filter(Boolean)
    : [];
  const subDepartments = Array.isArray(access.subDepartments)
    ? access.subDepartments.map(normalizeDepartmentNode).filter(Boolean)
    : [];
  const subDepartmentIds = Array.isArray(access.subDepartmentIds)
    ? access.subDepartmentIds
        .map((value) => (typeof value === "string" ? value.trim() : ""))
        .filter(Boolean)
    : subDepartments.map((department) => department.id);
  const departmentId = typeof access.departmentId === "string" ? access.departmentId.trim() : "";
  const departmentName =
    typeof access.departmentName === "string" ? access.departmentName.trim() : "";

  return {
    userType: typeof access.userType === "string" ? access.userType : "unknown",
    departmentId: departmentId || null,
    departmentName: departmentName || null,
    departmentPath,
    subDepartments,
    subDepartmentIds,
    isManager: Boolean(access.isManager),
    isAdmin: Boolean(access.isAdmin),
    isExecutive: Boolean(access.isExecutive),
    isSuperAdmin: Boolean(access.isSuperAdmin)
  };
}

function tierAtLeast(currentTier, requiredTier) {
  const currentTierIndex = DASHBOARD_TIERS.indexOf(currentTier);
  const requiredTierIndex = DASHBOARD_TIERS.indexOf(requiredTier);
  if (requiredTierIndex === -1) {
    return true;
  }
  if (currentTierIndex === -1) {
    return false;
  }
  return currentTierIndex >= requiredTierIndex;
}

export function resolveDashboardTier(access) {
  const normalizedAccess = normalizeAccessContext(access);
  if (normalizedAccess.isSuperAdmin) {
    return "super_admin";
  }
  if (normalizedAccess.isExecutive) {
    return "executive";
  }
  if (normalizedAccess.isAdmin) {
    return "admin";
  }
  if (normalizedAccess.isManager) {
    return "manager";
  }
  return "employee";
}

function hasAnyFlag(normalizedAccess, flags) {
  if (!Array.isArray(flags) || flags.length === 0) {
    return true;
  }
  return flags.some((flag) => Boolean(normalizedAccess[flag]));
}

function hasAllFlags(normalizedAccess, flags) {
  if (!Array.isArray(flags) || flags.length === 0) {
    return true;
  }
  return flags.every((flag) => Boolean(normalizedAccess[flag]));
}

function isModuleVisible(module, normalizedAccess, resolvedTier) {
  const visibility = module.visibility ?? {};
  if (!tierAtLeast(resolvedTier, visibility.minimumTier ?? "employee")) {
    return false;
  }
  if (!hasAnyFlag(normalizedAccess, visibility.requireAnyFlags)) {
    return false;
  }
  if (!hasAllFlags(normalizedAccess, visibility.requireAllFlags)) {
    return false;
  }
  if (visibility.requireDepartment && !normalizedAccess.departmentId) {
    return false;
  }
  if (visibility.requireSubDepartments && normalizedAccess.subDepartmentIds.length === 0) {
    return false;
  }
  return true;
}

export function resolveDashboardModules(access) {
  const normalizedAccess = normalizeAccessContext(access);
  const resolvedTier = resolveDashboardTier(normalizedAccess);
  return MODULE_REGISTRY.filter((module) => isModuleVisible(module, normalizedAccess, resolvedTier));
}

export function summarizeDashboardAccess(access) {
  const normalizedAccess = normalizeAccessContext(access);
  const departmentPathLabel = normalizedAccess.departmentPath.map((node) => node.name).join(" / ");

  return {
    tier: resolveDashboardTier(normalizedAccess),
    userType: normalizedAccess.userType,
    departmentLabel: normalizedAccess.departmentName ?? "Unassigned",
    departmentPathLabel: departmentPathLabel || "Unassigned",
    subDepartmentCount: normalizedAccess.subDepartmentIds.length,
    subDepartmentNames: normalizedAccess.subDepartments.map((node) => node.name),
    flags: {
      isManager: normalizedAccess.isManager,
      isAdmin: normalizedAccess.isAdmin,
      isExecutive: normalizedAccess.isExecutive,
      isSuperAdmin: normalizedAccess.isSuperAdmin
    }
  };
}
