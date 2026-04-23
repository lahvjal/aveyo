"use client";

import { useMemo } from "react";
import { usePathname } from "next/navigation";
import { AvaWidgetEmbedBridge, createSignedOutSnapshot } from "@ava/widget";
import { useAuthSession } from "@/lib/auth/use-auth-session";

const EXCLUDED_WIDGET_PATH_PREFIXES = ["/embed", "/widget"];

function AvaWidgetEmbedBridgeHost() {
  const authSession = useAuthSession();
  const hostSessionSnapshot = useMemo(() => {
    if (!authSession.authenticated) {
      return createSignedOutSnapshot();
    }

    return {
      authenticated: true,
      role: authSession.role,
      userType: authSession.userType,
      user: authSession.user
    };
  }, [authSession.authenticated, authSession.role, authSession.userType, authSession.user]);

  return <AvaWidgetEmbedBridge hostSessionSnapshot={hostSessionSnapshot} registerGlobalApi />;
}

export default function AvaWidgetEmbed() {
  const pathname = usePathname() ?? "";
  const shouldSkipEmbedBridge = EXCLUDED_WIDGET_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );

  if (shouldSkipEmbedBridge) {
    return null;
  }

  return <AvaWidgetEmbedBridgeHost />;
}
