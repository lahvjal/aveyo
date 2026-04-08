const ADMIN_ROLE_KEYS = new Set([
  "admin",
  "org_admin",
  "org-admin",
  "platform_admin",
  "platform-admin",
  "super_admin",
  "super-admin",
  "superadmin"
]);

export function isAdminRole(role: string | null | undefined): boolean {
  if (typeof role !== "string") {
    return false;
  }
  return ADMIN_ROLE_KEYS.has(role.trim().toLowerCase());
}
