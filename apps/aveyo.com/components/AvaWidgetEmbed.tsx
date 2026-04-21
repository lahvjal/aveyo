"use client";

import { resolveEnvironment } from "@ava/config/runtime/app-urls";
import { AvaWidgetShell } from "@ava/widget";
import { useMemo } from "react";
import { toHostSessionSnapshot, useMarketingSiteAuthSession } from "@/lib/auth/session";

export default function AvaWidgetEmbed() {
  const authSession = useMarketingSiteAuthSession();
  const apiBaseUrl = useMemo(() => {
    if (typeof window === "undefined") {
      return undefined;
    }
    if (resolveEnvironment(window.location.hostname) !== "local") {
      return undefined;
    }
    return window.location.origin;
  }, []);
  const sessionSnapshot = useMemo(() => toHostSessionSnapshot(authSession), [authSession]);

  return (
    <div className="widget-route-root widget-embed-root">
      <AvaWidgetShell
        defaultOpen={false}
        showEmbedNote={false}
        apiBaseUrl={apiBaseUrl}
        sessionSnapshot={sessionSnapshot}
      />
    </div>
  );
}
