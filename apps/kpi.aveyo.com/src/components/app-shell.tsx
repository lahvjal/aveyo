"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { EmployeeSideNav } from "@/components/employee-side-nav";
import { PlatformShell } from "@ava/ui";

const settingsNav = [
  { label: "Goals", href: "/settings/goals" },
  { label: "KPI Management", href: "/settings/kpis" },
  { label: "KPI Documentation", href: "/settings/documentation" },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isSettingsRoute = pathname?.startsWith("/settings");
  const isActive = (href: string) => pathname?.startsWith(href);

  return (
    <PlatformShell
      shellClassName="kpi-layout-shell"
      sideNav={<EmployeeSideNav />}
      mainClassName="kpi-main-shell"
      mainTag="section"
    >
        {isSettingsRoute ? (
          <div className="kpi-settings-shell">
            <aside className="kpi-settings-nav">
              <p className="kpi-settings-label">Settings</p>
              {settingsNav.map(({ label, href }) => (
                <Link
                  key={href}
                  href={href}
                  className={`kpi-settings-link${isActive(href) ? " active" : ""}`}
                >
                  {label}
                </Link>
              ))}
            </aside>
            <div className="kpi-settings-content">{children}</div>
          </div>
        ) : (
          <div className="kpi-page-content">{children}</div>
        )}
    </PlatformShell>
  );
}
