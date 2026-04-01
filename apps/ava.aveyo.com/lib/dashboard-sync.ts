"use client";

export type DashboardSyncEventType = "handoff-claimed" | "handoff-resolved";

export interface DashboardSyncEvent {
  type: DashboardSyncEventType;
  requestId: string;
  conversationId: string;
  timestamp: string;
}

const DASHBOARD_SYNC_CHANNEL = "ava-dashboard-sync-v1";

function createBroadcastChannel() {
  if (typeof window === "undefined" || typeof BroadcastChannel === "undefined") {
    return null;
  }

  return new BroadcastChannel(DASHBOARD_SYNC_CHANNEL);
}

function isValidSyncEvent(value: unknown): value is DashboardSyncEvent {
  if (!value || typeof value !== "object") {
    return false;
  }

  const record = value as Record<string, unknown>;
  const validType = record.type === "handoff-claimed" || record.type === "handoff-resolved";
  return (
    validType &&
    typeof record.requestId === "string" &&
    typeof record.conversationId === "string" &&
    typeof record.timestamp === "string"
  );
}

export function publishDashboardSyncEvent(event: DashboardSyncEvent) {
  const channel = createBroadcastChannel();
  if (!channel) {
    return;
  }

  channel.postMessage(event);
  channel.close();
}

export function subscribeDashboardSyncEvents(
  onEvent: (event: DashboardSyncEvent) => void
): () => void {
  const channel = createBroadcastChannel();
  if (!channel) {
    return () => {};
  }

  const onMessage = (message: MessageEvent<unknown>) => {
    if (!isValidSyncEvent(message.data)) {
      return;
    }
    onEvent(message.data);
  };

  channel.addEventListener("message", onMessage);
  return () => {
    channel.removeEventListener("message", onMessage);
    channel.close();
  };
}
