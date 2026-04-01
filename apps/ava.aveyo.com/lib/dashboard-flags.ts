export function isDashboardV2Enabled() {
  const value = process.env.NEXT_PUBLIC_AVA_DASHBOARD_V2;
  if (!value) {
    return true;
  }

  const normalized = value.trim().toLowerCase();
  return normalized !== "0" && normalized !== "false" && normalized !== "off";
}
