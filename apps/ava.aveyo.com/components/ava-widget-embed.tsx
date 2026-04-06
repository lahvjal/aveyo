"use client";

import { usePathname } from "next/navigation";
import { AvaWidgetEmbedBridge } from "@ava/widget";

const EXCLUDED_WIDGET_PATH_PREFIXES = ["/embed", "/widget"];

export default function AvaWidgetEmbed() {
  const pathname = usePathname() ?? "";
  const shouldSkipEmbedBridge = EXCLUDED_WIDGET_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );

  if (shouldSkipEmbedBridge) {
    return null;
  }

  return <AvaWidgetEmbedBridge registerGlobalApi />;
}
