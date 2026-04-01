import type { ReactNode } from "react";

interface PlatformShellProps {
  sideNav: ReactNode;
  children: ReactNode;
  shellClassName: string;
  mainClassName: string;
  mainTag?: "main" | "section";
}

export function PlatformShell({
  sideNav,
  children,
  shellClassName,
  mainClassName,
  mainTag = "main"
}: PlatformShellProps) {
  if (mainTag === "section") {
    return (
      <div className={shellClassName}>
        {sideNav}
        <section className={mainClassName}>{children}</section>
      </div>
    );
  }

  return (
    <div className={shellClassName}>
      {sideNav}
      <main className={mainClassName}>{children}</main>
    </div>
  );
}
