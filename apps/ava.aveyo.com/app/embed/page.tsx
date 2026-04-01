"use client";

import { useEffect } from "react";
import { AvaWidgetShell } from "@ava/widget";

export default function EmbedPage() {
  useEffect(() => {
    document.documentElement.classList.add("ava-embed-mode");
    document.body.classList.add("ava-embed-mode");

    return () => {
      document.documentElement.classList.remove("ava-embed-mode");
      document.body.classList.remove("ava-embed-mode");
    };
  }, []);

  return (
    <main className="widget-route-root widget-embed-root" style={{ minHeight: "100vh" }}>
      <AvaWidgetShell defaultOpen={false} showEmbedNote={false} />
    </main>
  );
}
