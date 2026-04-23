"use client";

import { AvaWidgetEmbedBridge, createSignedOutSnapshot } from "@ava/widget";

export default function AvaWidgetEmbed() {
  return (
    <AvaWidgetEmbedBridge
      hostSessionSnapshot={createSignedOutSnapshot()}
      registerGlobalApi
    />
  );
}
