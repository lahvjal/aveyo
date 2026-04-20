export type RealtimeInvalidationKind =
  | "message_created"
  | "handoff_requested"
  | "handoff_claimed"
  | "handoff_resolved";

export interface RealtimeInvalidationPayload {
  kind: RealtimeInvalidationKind;
  conversationId: string;
  recordId: string;
  createdAt: string;
}

export type RealtimeTypingActor = "customer" | "representative" | "ava";

export interface RealtimeTypingPayload {
  kind: "typing";
  conversationId: string;
  recordId: string;
  createdAt: string;
  actor: RealtimeTypingActor;
  actorUserId: string | null;
  isTyping: boolean;
}

interface SubscribeRealtimeInvalidationStreamOptions {
  baseUrl: string;
  conversationId?: string;
  onInvalidate: (payload: RealtimeInvalidationPayload) => void;
  onTyping?: (payload: RealtimeTypingPayload) => void;
  onReady?: () => void;
  onError?: () => void;
}

function buildRealtimeStreamUrl(baseUrl: string, conversationId?: string) {
  const url = new URL("/api/realtime/stream", baseUrl);
  if (conversationId) {
    url.searchParams.set("conversationId", conversationId);
  }
  return url.toString();
}

function parseInvalidationPayload(value: string): RealtimeInvalidationPayload | null {
  try {
    const parsed = JSON.parse(value) as Partial<RealtimeInvalidationPayload>;
    if (
      parsed &&
      typeof parsed.kind === "string" &&
      typeof parsed.conversationId === "string" &&
      typeof parsed.recordId === "string" &&
      typeof parsed.createdAt === "string"
    ) {
      return parsed as RealtimeInvalidationPayload;
    }
  } catch {
    return null;
  }
  return null;
}

function parseTypingPayload(value: string): RealtimeTypingPayload | null {
  try {
    const parsed = JSON.parse(value) as Partial<RealtimeTypingPayload>;
    if (
      parsed &&
      parsed.kind === "typing" &&
      typeof parsed.conversationId === "string" &&
      typeof parsed.recordId === "string" &&
      typeof parsed.createdAt === "string" &&
      (parsed.actor === "customer" || parsed.actor === "representative" || parsed.actor === "ava") &&
      typeof parsed.isTyping === "boolean" &&
      (parsed.actorUserId === null || typeof parsed.actorUserId === "string" || parsed.actorUserId === undefined)
    ) {
      return {
        kind: "typing",
        conversationId: parsed.conversationId,
        recordId: parsed.recordId,
        createdAt: parsed.createdAt,
        actor: parsed.actor,
        actorUserId: parsed.actorUserId ?? null,
        isTyping: parsed.isTyping
      };
    }
  } catch {
    return null;
  }
  return null;
}

export function subscribeToRealtimeInvalidationStream({
  baseUrl,
  conversationId,
  onInvalidate,
  onTyping,
  onReady,
  onError
}: SubscribeRealtimeInvalidationStreamOptions) {
  const eventSource = new EventSource(buildRealtimeStreamUrl(baseUrl, conversationId), {
    withCredentials: true
  });

  const handleReady = () => {
    onReady?.();
  };
  const handleInvalidate = (event: MessageEvent<string>) => {
    const payload = parseInvalidationPayload(event.data);
    if (payload) {
      onInvalidate(payload);
    }
  };
  const handleTyping = (event: MessageEvent<string>) => {
    const payload = parseTypingPayload(event.data);
    if (payload) {
      onTyping?.(payload);
    }
  };
  const handleError = () => {
    onError?.();
  };

  eventSource.addEventListener("ready", handleReady as EventListener);
  eventSource.addEventListener("invalidate", handleInvalidate as EventListener);
  eventSource.addEventListener("typing", handleTyping as EventListener);
  eventSource.addEventListener("error", handleError as EventListener);

  return () => {
    eventSource.removeEventListener("ready", handleReady as EventListener);
    eventSource.removeEventListener("invalidate", handleInvalidate as EventListener);
    eventSource.removeEventListener("typing", handleTyping as EventListener);
    eventSource.removeEventListener("error", handleError as EventListener);
    eventSource.close();
  };
}
