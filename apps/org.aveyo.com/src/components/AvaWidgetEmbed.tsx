"use client";

import { useMemo } from "react";
import { AvaWidgetEmbedBridge, createSignedOutSnapshot } from "@ava/widget";
import { useAuthSession } from "@/lib/auth/use-auth-session";

export default function AvaWidgetEmbed() {
  const authSession = useAuthSession();
  const hostSessionSnapshot = useMemo(() => {
    if (!authSession.authenticated) {
      return createSignedOutSnapshot();
    }

    return {
      authenticated: true,
      role: authSession.role,
      userType: "employee" as const,
      user: authSession.user
    };
  }, [authSession.authenticated, authSession.role, authSession.user]);

  return <AvaWidgetEmbedBridge hostSessionSnapshot={hostSessionSnapshot} registerGlobalApi />;
}
