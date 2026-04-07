"use client";

import { DashboardManagerShell } from "@/components/dashboard/dashboard-manager-shell";
import { isDashboardV2Enabled } from "@/lib/dashboard-flags";

export function RepManagerShell() {
  if (isDashboardV2Enabled()) {
    return <DashboardManagerShell />;
  }

  return <DashboardManagerShell />;
}
