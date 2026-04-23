"use client";

import { AppLoadingOverlay } from "@ava/ui";
import { usePathname } from "next/navigation";

export default function RouteLoadingOverlay() {
  const pathname = usePathname() ?? "";
  return <AppLoadingOverlay routeKey={pathname} />;
}
