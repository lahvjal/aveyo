import { type ConversationThread, type TimelineMessage } from "@ava/chat-domain";
import { authApiRequest } from "@/lib/auth/session";
import {
  type ConversationCustomerDetails,
  type QueueRecord,
  type RealtimeEvent,
  type SupportAgentNote
} from "@/lib/ava-api-types";

export type { ConversationCustomerDetails, QueueRecord, RealtimeEvent, SupportAgentNote };

async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  return authApiRequest<T>(path, init);
}

export function listQueueApi(options?: { resolvedScope?: "all" | "agent" }) {
  const params = new URLSearchParams();
  if (options?.resolvedScope) {
    params.set("resolvedScope", options.resolvedScope);
  }
  const query = params.toString();
  const path = query ? `/api/handoff/queue?${query}` : "/api/handoff/queue";
  return apiRequest<{
    queue: QueueRecord[];
    pendingCount: number;
    activeCount: number;
    resolvedCount: number;
  }>(path, {
    method: "GET"
  });
}

export function listConversationsApi() {
  return apiRequest<{ conversations: ConversationThread[] }>("/api/conversations", {
    method: "GET"
  });
}

export function getConversationApi(conversationId: string) {
  return apiRequest<{ conversation: ConversationThread }>(`/api/conversations/${conversationId}`, {
    method: "GET"
  });
}

export function claimHandoffApi(body: {
  requestId: string;
  representative: {
    id: string;
    name: string;
    avatarUrl?: string;
  };
}) {
  return apiRequest<{ thread: ConversationThread; queue: QueueRecord }>("/api/handoff/claim", {
    method: "POST",
    body: JSON.stringify(body)
  });
}

export function resolveHandoffApi(body: { conversationId: string; resolutionNote?: string }) {
  return apiRequest<{ thread: ConversationThread }>("/api/handoff/resolve", {
    method: "POST",
    body: JSON.stringify(body)
  });
}

export function createRepresentativeMessageApi(body: {
  conversationId: string;
  text: string;
  representativeId: string;
  clientMessageId?: string;
}) {
  return apiRequest<{ message: TimelineMessage }>("/api/messages", {
    method: "POST",
    body: JSON.stringify({
      conversationId: body.conversationId,
      kind: "representative",
      representativeId: body.representativeId,
      text: body.text,
      clientMessageId: body.clientMessageId
    })
  });
}

export function getRealtimeEventsApi(afterEventId?: string) {
  const query = afterEventId
    ? `?afterEventId=${encodeURIComponent(afterEventId)}`
    : "";

  return apiRequest<{ events: RealtimeEvent[]; cursor?: string; cursorStale?: boolean }>(
    `/api/realtime/events${query}`,
    {
      method: "GET"
    }
  );
}

export function listSupportNotesApi(conversationId: string) {
  return apiRequest<{ notes: SupportAgentNote[] }>(
    `/api/conversations/${conversationId}/notes`,
    {
      method: "GET"
    }
  );
}

export function createSupportNoteApi(conversationId: string, body: { body: string }) {
  return apiRequest<{ note: SupportAgentNote }>(
    `/api/conversations/${conversationId}/notes`,
    {
      method: "POST",
      body: JSON.stringify(body)
    }
  );
}

export function getConversationCustomerDetailsApi(conversationId: string) {
  return apiRequest<{ details: ConversationCustomerDetails }>(
    `/api/conversations/${conversationId}/customer-details`,
    {
      method: "GET"
    }
  );
}
