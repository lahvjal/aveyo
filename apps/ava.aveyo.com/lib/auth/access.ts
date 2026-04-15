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

export function canAccessAvaManagerViews(role: string | null | undefined) {
  const normalizedRole = typeof role === "string" ? role.trim().toLowerCase() : "";
  return MANAGER_VIEW_ROLE_KEYS.has(normalizedRole);
}
