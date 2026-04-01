import { EmployeeSideNav } from "./EmployeeSideNav";
import { PlatformShell } from "@ava/ui";

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <PlatformShell
      shellClassName="org-layout-shell"
      sideNav={<EmployeeSideNav />}
      mainClassName="org-workspace"
    >
      {children}
    </PlatformShell>
  );
}
