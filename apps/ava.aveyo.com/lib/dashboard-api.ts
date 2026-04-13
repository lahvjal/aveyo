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

export function publishRepresentativeTypingApi(body: {
  conversationId: string;
  isTyping: boolean;
}) {
  return apiRequest<{ ok: boolean }>("/api/realtime/typing", {
    method: "POST",
    body: JSON.stringify({
      conversationId: body.conversationId,
      actor: "representative",
      isTyping: body.isTyping
    })
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

export interface SupportPresenceResult {
  status: "online" | "offline";
  desiredStatus: "online" | "offline";
  lastHeartbeatAt: string | null;
  heartbeatTtlSeconds: number;
}

function updateSupportPresenceApi(action: "online" | "offline" | "heartbeat") {
  return apiRequest<SupportPresenceResult>("/api/support/presence", {
    method: "POST",
    body: JSON.stringify({ action })
  });
}

export function getSupportPresenceApi() {
  return apiRequest<SupportPresenceResult>("/api/support/presence", {
    method: "GET"
  });
}

export function setSupportPresenceOnlineApi() {
  return updateSupportPresenceApi("online");
}

export function setSupportPresenceOfflineApi() {
  return updateSupportPresenceApi("offline");
}

export function heartbeatSupportPresenceApi() {
  return updateSupportPresenceApi("heartbeat");
}

export type ManagerDateRangePreset = "today" | "7d" | "30d" | "custom";

export interface ManagerDateRangeQuery {
  from?: string;
  to?: string;
  tz?: string;
  preset?: ManagerDateRangePreset;
}

function managerRangeQueryString(range?: ManagerDateRangeQuery) {
  const params = new URLSearchParams();
  if (range?.preset) {
    params.set("preset", range.preset);
  }
  if (range?.from) {
    params.set("from", range.from);
  }
  if (range?.to) {
    params.set("to", range.to);
  }
  if (range?.tz) {
    params.set("tz", range.tz);
  }
  const query = params.toString();
  return query ? `?${query}` : "";
}

export interface ManagerOverviewResult {
  range: {
    from: string;
    to: string;
    preset: ManagerDateRangePreset;
    tz: string;
  };
  metrics: {
    customerChatsWithAva: number;
    employeeChatsWithAva: number;
    handoffsToAgent: number;
    activeHandoffsNow: number;
    pendingHandoffsNow: number;
    handoffRate: number;
    containmentRate: number;
    aiEndedOrResolvedWithoutHandoff: number;
    endedOrResolvedWithHandoff: number;
    totalEndedOrResolvedChats: number;
  };
  sensitivitySummary: {
    customerAverageScore: number;
    agentAverageScore: number;
    highRiskCustomers: number;
    highRiskAgents: number;
  };
}

export interface ManagerAgentRecord {
  agentId: string;
  name: string;
  avatarUrl: string | null;
  status: "online" | "offline";
  activeHandoffs: number;
  avgRating: number | null;
  ratingCount: number;
  avgFirstReplySeconds: number | null;
  avgResolutionSeconds: number | null;
  sensitivityScore: number;
  sensitivityBand: "low" | "medium" | "high";
}

export interface ManagerAgentsResult {
  range: {
    from: string;
    to: string;
    preset: ManagerDateRangePreset;
    tz: string;
  };
  agents: ManagerAgentRecord[];
}

export interface ManagerHandoffRecord {
  requestId: string;
  conversationId: string;
  customerName: string;
  customerAvatarUrl: string | null;
  status: "open" | "pending" | "claimed" | "active" | "resolved";
  requestedAt: string;
  claimedAt: string | null;
  resolvedAt: string | null;
  assignedAgentId: string | null;
  assignedAgentName: string | null;
  assignedAgentAvatarUrl: string | null;
  isEnded: boolean;
  customerRating: "thumbs_up" | "thumbs_down" | null;
  firstReplyAt: string | null;
  firstReplySeconds: number | null;
  resolutionSeconds: number | null;
  lastMessageAt: string | null;
  staleMinutes: number | null;
  slowFirstReply: boolean;
  needsAttention: boolean;
  customerSensitivityScore: number;
  customerSensitivityBand: "low" | "medium" | "high";
  agentSensitivityScore: number;
  agentSensitivityBand: "low" | "medium" | "high";
}

export interface ManagerHandoffsResult {
  range: {
    from: string;
    to: string;
    preset: ManagerDateRangePreset;
    tz: string;
  };
  handoffs: ManagerHandoffRecord[];
}

export interface ManagerConfig {
  timezone: string;
  workingHours: {
    enabled: boolean;
    weekdays: number[];
    startHour24: number;
    endHour24: number;
  };
  thresholds: {
    slowFirstReplyMinutes: number;
    stalledConversationMinutes: number;
  };
}

export interface ManagerConfigResult {
  config: ManagerConfig;
  updatedAt: string | null;
  updatedBy: string | null;
}

export interface ManagerReassignResult {
  requestId: string;
  conversationId: string;
  previousAgentId: string | null;
  targetAgentId: string;
  targetAgentName: string;
  reassignedAt: string;
}

export function getManagerOverviewApi(range?: ManagerDateRangeQuery) {
  return apiRequest<ManagerOverviewResult>(`/api/manager/overview${managerRangeQueryString(range)}`, {
    method: "GET"
  });
}

export function getManagerAgentsApi(range?: ManagerDateRangeQuery) {
  return apiRequest<ManagerAgentsResult>(`/api/manager/agents${managerRangeQueryString(range)}`, {
    method: "GET"
  });
}

export function getManagerHandoffsApi(range?: ManagerDateRangeQuery) {
  return apiRequest<ManagerHandoffsResult>(`/api/manager/handoffs${managerRangeQueryString(range)}`, {
    method: "GET"
  });
}

export function getManagerConfigApi() {
  return apiRequest<ManagerConfigResult>("/api/manager/config", {
    method: "GET"
  });
}

export function updateManagerConfigApi(body: {
  timezone?: string;
  workingHours?: {
    enabled?: boolean;
    weekdays?: number[];
    startHour24?: number;
    endHour24?: number;
  };
  thresholds?: {
    slowFirstReplyMinutes?: number;
    stalledConversationMinutes?: number;
  };
}) {
  return apiRequest<ManagerConfigResult>("/api/manager/config", {
    method: "POST",
    body: JSON.stringify(body)
  });
}

export function reassignManagerHandoffApi(body: {
  requestId: string;
  targetAgentId: string;
  reason?: string;
}) {
  return apiRequest<ManagerReassignResult>("/api/manager/handoffs/reassign", {
    method: "POST",
    body: JSON.stringify(body)
  });
}

export interface RepresentativeReplySuggestionResult {
  suggestion: string | null;
  sourceCustomerMessageId: string | null;
}

export function getRepresentativeReplySuggestionApi(conversationId: string) {
  return apiRequest<RepresentativeReplySuggestionResult>(
    `/api/conversations/${conversationId}/reply-suggestion`,
    {
      method: "GET"
    }
  );
}
