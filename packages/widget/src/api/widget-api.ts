import { type ConversationThread, type TimelineMessage } from "@ava/chat-domain";
import { resolveDefaultApiBaseUrl } from "../session";

export interface RealtimeEvent {
  id: string;
  type: "message_created" | "handoff_requested" | "handoff_claimed" | "handoff_resolved" | "typing";
  conversationId: string;
  createdAt: string;
  payload: unknown;
}

export interface ImpersonationCustomer {
  projectRef: string;
  customerId: string | null;
  customerName: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  projectStatus: string | null;
  projectTitle: string | null;
}

export interface WidgetApiClient {
  listConversations: (options?: {
    excludeImpersonation?: boolean;
  }) => Promise<{ conversations: ConversationThread[] }>;
  createConversation: (body?: {
    subject?: string;
    projectRef?: string;
    greetingText?: string;
  }) => Promise<{ conversation: ConversationThread }>;
  getConversation: (conversationId: string) => Promise<{ conversation: ConversationThread }>;
  createCustomerMessage: (body: {
    conversationId: string;
    text: string;
    clientMessageId?: string;
  }) => Promise<{ message: TimelineMessage }>;
  requestHandoff: (body: {
    conversationId: string;
    customerName: string;
    reason?: string;
  }) => Promise<{ thread: ConversationThread }>;
  submitHandoffRating: (body: {
    conversationId: string;
    rating: "thumbs_up" | "thumbs_down";
  }) => Promise<{ thread: ConversationThread }>;
  getRealtimeEvents: (
    afterEventId?: string
  ) => Promise<{ events: RealtimeEvent[]; cursor?: string; cursorStale?: boolean }>;
  listImpersonationCustomers: (
    query?: string,
    limit?: number
  ) => Promise<{ customers: ImpersonationCustomer[] }>;
  createImpersonationConversation: (body: {
    projectRef: string;
    customerName?: string;
    customerEmail?: string;
    greetingText?: string;
  }) => Promise<{ conversation: ConversationThread }>;
}

interface CreateWidgetApiClientOptions {
  apiBaseUrl?: string;
}

function readErrorMessage(payload: unknown) {
  if (payload && typeof payload === "object" && "error" in payload) {
    const value = (payload as Record<string, unknown>).error;
    if (typeof value === "string" && value.trim()) {
      return value;
    }
  }
  return undefined;
}

async function requestJson<T>(
  baseUrl: string,
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const headers = new Headers(init.headers);
  if (!headers.has("Content-Type") && init.method && init.method !== "GET") {
    headers.set("Content-Type", "application/json");
  }

  const executeRequest = async () => {
    const response = await fetch(`${baseUrl}${path}`, {
      ...init,
      headers,
      credentials: "include"
    });
    const payload = await response.json().catch(() => null);
    return { response, payload };
  };

  let { response, payload } = await executeRequest();

  if (response.status === 401) {
    await fetch(`${baseUrl}/api/auth/session`, {
      method: "GET",
      credentials: "include",
      cache: "no-store"
    }).catch(() => null);

    ({ response, payload } = await executeRequest());
  }

  if (!response.ok) {
    throw new Error(
      readErrorMessage(payload) ??
        `API request failed (${response.status}) for ${init.method ?? "GET"} ${path}.`
    );
  }

  return payload as T;
}

export function createWidgetApiClient({
  apiBaseUrl
}: CreateWidgetApiClientOptions = {}): WidgetApiClient {
  const resolvedBaseUrl = apiBaseUrl ?? resolveDefaultApiBaseUrl();
  if (!resolvedBaseUrl) {
    throw new Error("Ava widget API base URL is not configured.");
  }

  return {
    listConversations: (options) => {
      const query = options?.excludeImpersonation ? "?excludeImpersonation=1" : "";
      return requestJson<{ conversations: ConversationThread[] }>(
        resolvedBaseUrl,
        `/api/conversations${query}`,
        {
          method: "GET",
          cache: "no-store"
        }
      );
    },

    createConversation: (body) =>
      requestJson<{ conversation: ConversationThread }>(resolvedBaseUrl, "/api/conversations", {
        method: "POST",
        body: JSON.stringify(body ?? {})
      }),

    getConversation: (conversationId) =>
      requestJson<{ conversation: ConversationThread }>(
        resolvedBaseUrl,
        `/api/conversations/${conversationId}`,
        {
          method: "GET",
          cache: "no-store"
        }
      ),

    createCustomerMessage: (body) =>
      requestJson<{ message: TimelineMessage }>(resolvedBaseUrl, "/api/messages", {
        method: "POST",
        body: JSON.stringify({
          conversationId: body.conversationId,
          kind: "customer",
          text: body.text,
          clientMessageId: body.clientMessageId
        })
      }),

    requestHandoff: (body) =>
      requestJson<{ thread: ConversationThread }>(resolvedBaseUrl, "/api/handoff/request", {
        method: "POST",
        body: JSON.stringify(body)
      }),

    submitHandoffRating: (body) =>
      requestJson<{ thread: ConversationThread }>(resolvedBaseUrl, "/api/handoff/rating", {
        method: "POST",
        body: JSON.stringify(body)
      }),

    getRealtimeEvents: (afterEventId) => {
      const query = afterEventId ? `?afterEventId=${encodeURIComponent(afterEventId)}` : "";
      return requestJson<{ events: RealtimeEvent[]; cursor?: string; cursorStale?: boolean }>(
        resolvedBaseUrl,
        `/api/realtime/events${query}`,
        {
          method: "GET",
          cache: "no-store"
        }
      );
    },

    listImpersonationCustomers: (query, limit = 25) => {
      const params = new URLSearchParams();
      if (query?.trim()) {
        params.set("query", query.trim());
      }
      params.set("limit", String(limit));
      return requestJson<{ customers: ImpersonationCustomer[] }>(
        resolvedBaseUrl,
        `/api/impersonation/customers?${params.toString()}`,
        {
          method: "GET",
          cache: "no-store"
        }
      );
    },

    createImpersonationConversation: (body) =>
      requestJson<{ conversation: ConversationThread }>(
        resolvedBaseUrl,
        "/api/impersonation/conversations",
        {
          method: "POST",
          body: JSON.stringify(body)
        }
      )
  };
}
