import { type ConversationThread, type TimelineMessage } from "@ava/chat-domain";
import { authApiRequest } from "@/lib/auth/session";

export interface QueueRecord {
  requestId: string;
  conversationId: string;
  customerName: string;
  reason?: string;
  status: "pending" | "claimed" | "active" | "resolved";
  position: number;
  estimatedWaitSeconds: number;
  elapsedWaitSeconds: number;
  representative?: {
    id: string;
    name: string;
    avatarUrl?: string;
  };
  requestedAt: string;
}

export interface RealtimeEvent {
  id: string;
  type: "message_created" | "handoff_requested" | "handoff_claimed" | "handoff_resolved" | "typing";
  conversationId: string;
  createdAt: string;
  payload: unknown;
}

export interface SupportAgentNote {
  id: string;
  conversationId: string;
  author: {
    id: string;
    name: string;
  };
  body: string;
  createdAt: string;
}

export interface ConversationCustomerDetails {
  conversationId: string;
  customer: {
    authUserId: string;
    profileId: string | null;
    customerId: string | null;
    fullName: string | null;
    email: string | null;
    phone: string | null;
    address: string | null;
    fin: string | null;
  };
  project: {
    projectRef: string | null;
    projectStatus: string | null;
    siteAddress: string | null;
    metadata: Record<string, unknown>;
  };
}

async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  return authApiRequest<T>(path, init);
}

export function listQueueApi() {
  return apiRequest<{ queue: QueueRecord[]; pendingCount: number }>("/api/handoff/queue", {
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
}) {
  return apiRequest<{ message: TimelineMessage }>("/api/messages", {
    method: "POST",
    body: JSON.stringify({
      conversationId: body.conversationId,
      kind: "representative",
      representativeId: body.representativeId,
      text: body.text
    })
  });
}

export function getRealtimeEventsApi(afterEventId?: string) {
  const query = afterEventId
    ? `?afterEventId=${encodeURIComponent(afterEventId)}`
    : "";

  return apiRequest<{ events: RealtimeEvent[]; cursor?: string }>(`/api/realtime/events${query}`, {
    method: "GET"
  });
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
