import type { PlatformAccessContext } from "./session";

const MANAGER_VIEW_ROLE_KEYS = new Set([
  "manager",
  "support_manager",
  "support-manager",
  "org_manager",
  "org-manager",
  "team_manager",
  "team-manager",
  "admin",
  "org_admin",
  "org-admin",
  "platform_admin",
  "platform-admin",
  "super_admin",
  "super-admin",
  "superadmin"
]);

function isOperationsDepartmentManager(
  access: PlatformAccessContext | null | undefined
): boolean {
  if (!access?.isManager) {
    return false;
  }

  const pathNames = access.departmentPath.map((node) => node.name.trim().toLowerCase());
  if (access.departmentName) {
    pathNames.push(access.departmentName.trim().toLowerCase());
  }

  return pathNames.includes("operations");
}

export function canAccessAvaManagerViews(
  role: string | null | undefined,
  access?: PlatformAccessContext | null
) {
  if (access?.isAdmin || access?.isSuperAdmin) {
    return true;
  }

  const normalizedRole = typeof role === "string" ? role.trim().toLowerCase() : "";
  if (MANAGER_VIEW_ROLE_KEYS.has(normalizedRole)) {
    return true;
  }

  return isOperationsDepartmentManager(access);
}

export function canAccessAvaDashboard(
  role: string | null | undefined,
  access?: PlatformAccessContext | null
) {
  if (access?.isAdmin || access?.isSuperAdmin) {
    return true;
  }

  if (role === "support_agent" || role === "super_admin") {
    return true;
  }

  return isOperationsDepartmentManager(access);
}
