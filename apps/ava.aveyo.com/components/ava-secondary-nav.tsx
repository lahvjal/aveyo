"use client";

import Link from "next/link";

type SecondaryRoute = "dashboard";

interface AvaSecondaryNavProps {
  activeRoute: SecondaryRoute;
}

const secondaryNavItems: Array<{ id: SecondaryRoute; label: string; href: string }> = [
  { id: "dashboard", label: "Dashboard", href: "/" }
];

export function AvaSecondaryNav({ activeRoute }: AvaSecondaryNavProps) {
  return (
    <nav className="rep-secondary-nav" aria-label="Ava navigation">
      {secondaryNavItems.map((item) => (
        <Link
          key={item.id}
          href={item.href}
          className={`rep-secondary-nav-link${activeRoute === item.id ? " active" : ""}`}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
