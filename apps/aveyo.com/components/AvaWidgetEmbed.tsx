"use client";

import { AvaWidgetEmbedBridge } from "@ava/widget";
import { useMemo } from "react";
import { toHostSessionSnapshot, useMarketingSiteAuthSession } from "@/lib/auth/session";

export default function AvaWidgetEmbed() {
  const authSession = useMarketingSiteAuthSession();
  const hostSessionSnapshot = useMemo(() => toHostSessionSnapshot(authSession), [authSession]);

  return <AvaWidgetEmbedBridge hostSessionSnapshot={hostSessionSnapshot} registerGlobalApi />;
}
