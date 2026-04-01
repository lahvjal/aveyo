"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { LogOut } from "lucide-react";
import { getLocalAppUrl, trimTrailingSlash } from "@ava/config/runtime/app-urls";
import { useAuth } from "./auth-provider";
import { buildAuthLoginUrl } from "@/lib/auth/config";
import { logoutAuthSession } from "@/lib/auth/session";

const ORG_CHART_URL = (() => {
  const configured = process.env.NEXT_PUBLIC_ORG_CHART_URL?.trim();
  return configured ? trimTrailingSlash(configured) : getLocalAppUrl("org");
})();

// The geometric "A" mark extracted from the full Aveyo SVG wordmark
function AveyoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 22.27 18.31"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Aveyo"
    >
      <path
        d="M22.2627 18.305H18.0517C16.5845 18.305 15.3026 17.2559 14.9425 15.7501L11.1605 0.00195312H15.3291C16.7911 0.00195312 18.0729 1.0511 18.4331 2.54601L22.2627 18.305Z"
        fill="currentColor"
      />
      <path
        d="M0 18.305H7.24081C8.41142 18.305 9.48669 17.6364 10.0482 16.5546L13.5282 9.89006H6.32975C5.16444 9.89006 4.09448 10.5533 3.52771 11.6241L0 18.305Z"
        fill="currentColor"
      />
      <path
        d="M0.0582657 8.42234H4.86782C6.03843 8.42234 7.11369 7.75371 7.67516 6.67194L11.1605 0.00195312H6.38802C5.22801 0.00195312 4.15274 0.665146 3.58598 1.73604L0.0582657 8.42234Z"
        fill="currentColor"
      />
    </svg>
  );
}

function UserAvatar({
  photoUrl,
  fullName,
}: {
  photoUrl: string | null;
  fullName: string | null;
}) {
  const initials = fullName
    ? fullName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "?";

  if (photoUrl) {
    return (
      <Image
        src={photoUrl}
        alt={fullName ?? "User avatar"}
        width={32}
        height={32}
        className="h-8 w-8 rounded-full object-cover"
      />
    );
  }

  return (
    <div className="h-8 w-8 rounded-full bg-slate-700 text-white flex items-center justify-center text-xs font-semibold select-none">
      {initials}
    </div>
  );
}

export function Header() {
  const pathname = usePathname();
  const { user, profile } = useAuth();

  const handleSignOut = async () => {
    await logoutAuthSession();
    const returnTo = `${window.location.origin}/`;
    window.location.replace(buildAuthLoginUrl(returnTo, { logout: true }));
  };

  const navLinks = [
    { label: "Org Chart", href: ORG_CHART_URL, external: true },
    { label: "My Profile", href: `${ORG_CHART_URL}/profile`, external: true },
    { label: "Processes", href: `${ORG_CHART_URL}/processes`, external: true },
    { label: "Admin Panel", href: `${ORG_CHART_URL}/admin`, external: true },
    { label: "KPI Dashboard", href: "/", external: false },
    // { label: "Settings", href: "/settings", external: false },
  ];

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname?.startsWith(href) ?? false;
  };

  const displayName = profile?.full_name ?? user?.email?.split("@")[0] ?? "User";
  const jobTitle = profile?.job_title ?? null;

  return (
    <header className="sticky top-0 z-50 w-full border-b border-black bg-white">
      <div className="flex h-[65px] items-center gap-6 px-5">
        {/* Aveyo mark */}
        <a
          href={ORG_CHART_URL}
          className="flex-shrink-0 text-gray-900 hover:text-gray-600 transition-colors"
          aria-label="Back to Org Chart"
        >
          <AveyoMark className="h-[18px] w-auto" />
        </a>

        {/* Nav links */}
        <nav className="flex items-center gap-1">
          {navLinks.map(({ label, href, external }) => {
            const active = !external && isActive(href);
            const baseClass =
              "px-3 py-1.5 text-sm transition-colors";
            const activeClass = "text-black";
            const inactiveClass = "text-sm text-muted-foreground hover:text-foreground";

            if (external) {
              return (
                <a
                  key={label}
                  href={href}
                  className={`${baseClass} ${inactiveClass}`}
                >
                  {label}
                </a>
              );
            }

            return (
              <Link
                key={label}
                href={href}
                className={`${baseClass} ${active ? activeClass : inactiveClass}`}
              >
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Spacer */}
        <div className="flex-1" />

        {/* User info + sign out */}
        <div className="flex items-center gap-3">
          <UserAvatar
            photoUrl={profile?.profile_photo_url ?? null}
            fullName={profile?.full_name ?? null}
          />
          <div className="leading-tight">
            <p className="text-sm font-semibold text-gray-900">{displayName}</p>
            {jobTitle && (
              <p className="text-xs text-gray-500">{jobTitle}</p>
            )}
          </div>
          <button
            onClick={handleSignOut}
            className="ml-1 p-1.5 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
            title="Sign out"
            aria-label="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
