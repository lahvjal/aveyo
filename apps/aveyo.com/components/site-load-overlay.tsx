"use client";

import { AppLoadingOverlay } from "@ava/ui";
import { usePathname } from "next/navigation";

export function SiteLoadOverlay() {
  const pathname = usePathname() ?? "";
  return <AppLoadingOverlay routeKey={pathname} skipWhenHashPresent />;
}
