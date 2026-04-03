"use client";

import { DashboardResolvedShell } from "@/components/dashboard/dashboard-resolved-shell";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { isDashboardV2Enabled } from "@/lib/dashboard-flags";

export function RepResolvedShell() {
  if (isDashboardV2Enabled()) {
    return <DashboardResolvedShell />;
  }

  return <DashboardShell />;
}
