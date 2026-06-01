import type { PlatformSessionAccess } from "@ava/auth";
import type { MarketingSiteAuthSession } from "@/lib/auth/session";

function isMarketingDepartmentName(value: string | null | undefined) {
  return typeof value === "string" && value.toLowerCase().includes("marketing");
}

export function canEditMarketingSitePhotos(access: PlatformSessionAccess | null) {
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

export function canEditMarketingSitePhotosFromSession(session: MarketingSiteAuthSession) {
  return session.authenticated && canEditMarketingSitePhotos(session.access);
}
