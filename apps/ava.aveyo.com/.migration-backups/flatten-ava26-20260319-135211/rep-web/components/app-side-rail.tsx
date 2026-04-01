import Link from "next/link";
import { InitialChip } from "@/components/dashboard/initial-chip";

type RailRoute = "dashboard" | "widget";

interface AppSideRailProps {
  activeRoute: RailRoute;
  userName?: string | null;
  userAvatarUrl?: string | null;
  signOutPending?: boolean;
  onSignOut: () => void;
}

function getInitials(name: string | null | undefined) {
  const trimmed = typeof name === "string" ? name.trim() : "";
  if (!trimmed) {
    return "AG";
  }

  const parts = trimmed
    .split(" ")
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 2);

  if (parts.length === 0) {
    return "AG";
  }

  return parts.map((part) => part[0]?.toUpperCase() ?? "").join("");
}

export function AppSideRail({
  activeRoute,
  userName,
  userAvatarUrl,
  signOutPending = false,
  onSignOut
}: AppSideRailProps) {
  return (
    <aside className="rep-rail">
      <div className="brand-mark" aria-hidden>
        A
      </div>

      <nav className="rail-nav" aria-label="Primary">
        <Link href="/" className={`rail-nav-link ${activeRoute === "dashboard" ? "active" : ""}`}>
          Dashboard
        </Link>
        <Link href="/ava" className={`rail-nav-link ${activeRoute === "widget" ? "active" : ""}`}>
          Ava Widget
        </Link>
      </nav>

      <div className="rail-bottom">
        <button
          type="button"
          className="rail-signout"
          onClick={onSignOut}
          disabled={signOutPending}
        >
          {signOutPending ? "..." : "Sign Out"}
        </button>
        <InitialChip
          initials={getInitials(userName)}
          avatarUrl={userAvatarUrl}
          tone="sand"
          size={30}
        />
      </div>
    </aside>
  );
}
