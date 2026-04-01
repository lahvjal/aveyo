"use client";

import { AvaWidgetShell } from "@ava/widget";

export default function AvaWidgetEmbed() {
  return (
    <div className="widget-route-root widget-embed-root">
      <AvaWidgetShell defaultOpen={false} showEmbedNote={false} />
    </div>
  );
}
