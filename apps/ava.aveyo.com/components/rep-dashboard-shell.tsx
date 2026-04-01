"use client";

import { DashboardBoardShell } from "@/components/dashboard/dashboard-board-shell";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { isDashboardV2Enabled } from "@/lib/dashboard-flags";

export function RepDashboardShell() {
  if (isDashboardV2Enabled()) {
    return <DashboardBoardShell />;
  }

  return <DashboardShell />;
}
