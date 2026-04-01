import { type ConversationThread, type TimelineMessage } from "@ava/chat-domain";
import { authApiRequest } from "@/lib/auth/session";
import {
  type ImpersonationCustomer,
  type QueueRecord,
  type RealtimeEvent
} from "@/lib/ava-api-types";

export type { ImpersonationCustomer, QueueRecord, RealtimeEvent };

async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  return authApiRequest<T>(path, init);
}

export function listConversationsApi() {
  return apiRequest<{ conversations: ConversationThread[] }>("/api/conversations", {
    method: "GET"
  });
}

export function createConversationApi(body?: {
  subject?: string;
  projectRef?: string;
  greetingText?: string;
}) {
  return apiRequest<{ conversation: ConversationThread }>("/api/conversations", {
    method: "POST",
    body: JSON.stringify(body ?? {})
  });
}

export function getConversationApi(conversationId: string) {
  return apiRequest<{ conversation: ConversationThread }>(`/api/conversations/${conversationId}`, {
    method: "GET"
  });
}

export function createCustomerMessageApi(body: {
  conversationId: string;
  text: string;
  clientMessageId?: string;
}) {
  return apiRequest<{ message: TimelineMessage }>("/api/messages", {
    method: "POST",
    body: JSON.stringify({
      conversationId: body.conversationId,
      kind: "customer",
      text: body.text,
      clientMessageId: body.clientMessageId
    })
  });
}

export function requestHandoffApi(body: {
  conversationId: string;
  customerName: string;
  reason?: string;
}) {
  return apiRequest<{ thread: ConversationThread; queue: QueueRecord }>("/api/handoff/request", {
    method: "POST",
    body: JSON.stringify(body)
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

export function listImpersonationCustomersApi(query?: string, limit = 25) {
  const params = new URLSearchParams();
  if (query?.trim()) {
    params.set("query", query.trim());
  }
  params.set("limit", String(limit));

  return apiRequest<{ customers: ImpersonationCustomer[] }>(
    `/api/impersonation/customers?${params.toString()}`,
    {
      method: "GET"
    }
  );
}

export function createImpersonationConversationApi(body: {
  projectRef: string;
  customerName?: string;
  customerEmail?: string;
  greetingText?: string;
}) {
  return apiRequest<{ conversation: ConversationThread }>("/api/impersonation/conversations", {
    method: "POST",
    body: JSON.stringify(body)
  });
}
