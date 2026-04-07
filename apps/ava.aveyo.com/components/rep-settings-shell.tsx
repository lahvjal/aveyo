"use client";

import { DashboardSettingsShell } from "@/components/dashboard/dashboard-settings-shell";
import { isDashboardV2Enabled } from "@/lib/dashboard-flags";

export function RepSettingsShell() {
  if (isDashboardV2Enabled()) {
    return <DashboardSettingsShell />;
  }

  return <DashboardSettingsShell />;
}
