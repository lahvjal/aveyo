import type { PlatformSessionAccess } from "@ava/auth";
import type { PlatformAuthSession } from "@/lib/auth/use-auth-session";

function isMarketingDepartmentName(value: string | null | undefined) {
  return typeof value === "string" && value.toLowerCase().includes("marketing");
}

export function canManageCulture(access: PlatformSessionAccess | null) {
  if (!access || access.userType !== "employee") {
    return false;
  }

  if (access.isAdmin || access.isSuperAdmin) {
    return true;
  }

  if (isMarketingDepartmentName(access.departmentName)) {
    return true;
  }

  return access.departmentPath.some((department) => isMarketingDepartmentName(department.name));
}

export function canManageCultureFromSession(session: PlatformAuthSession) {
  return session.authenticated && canManageCulture(session.access);
}
