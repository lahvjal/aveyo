"use client";

import Link from "next/link";
import { type ReactNode } from "react";

type SecondaryRoute = "dashboard" | "resolved" | "manager" | "settings";

interface AvaSecondaryNavProps {
  activeRoute: SecondaryRoute;
  canAccessManagerViews?: boolean;
  trailingContent?: ReactNode;
}

const secondaryNavItems: Array<{ id: SecondaryRoute; label: string; href: string }> = [
  { id: "dashboard", label: "Dashboard", href: "/" },
  { id: "resolved", label: "Resolved", href: "/resolved" },
  { id: "manager", label: "Manager", href: "/manager" },
  { id: "settings", label: "Settings", href: "/settings" }
];

export function AvaSecondaryNav({
  activeRoute,
  canAccessManagerViews = false,
  trailingContent = null
}: AvaSecondaryNavProps) {
  const showManagerViews =
    canAccessManagerViews || activeRoute === "manager" || activeRoute === "settings";
  const visibleItems = showManagerViews
    ? secondaryNavItems
    : secondaryNavItems.filter((item) => item.id !== "manager" && item.id !== "settings");

  return (
    <nav
      className={`rep-secondary-nav${trailingContent ? " has-actions" : ""}`}
      aria-label="Ava navigation"
    >
      <div className="rep-secondary-nav-links">
        {visibleItems.map((item) => (
          <Link
            key={item.id}
            href={item.href}
            className={`rep-secondary-nav-link${activeRoute === item.id ? " active" : ""}`}
          >
            {item.label}
          </Link>
        ))}
      </div>
      {trailingContent ? <div className="rep-secondary-nav-actions">{trailingContent}</div> : null}
    </nav>
  );
}
