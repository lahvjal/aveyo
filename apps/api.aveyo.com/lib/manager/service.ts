import { type AppRole } from "@/lib/auth/types";
import { getOnlineSupportAgentIds } from "@/lib/presence/service";
import { ServiceError } from "@/lib/service-error";
import { computeOverallCustomerSentiment } from "@/lib/sentiment/customer-sentiment";
import { getSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { type ManagerDateRange } from "./date-range";

type QueueStatus = "pending" | "claimed" | "active" | "resolved";
type ConversationStatus = "open" | "pending_handoff" | "active_handoff" | "resolved" | "closed";
type HandoffState = "none" | "pending" | "claimed" | "active" | "resolved";
type ManagerPipelineStatus = QueueStatus | "open";
type HandoffEventType = "requested" | "claimed" | "activated" | "resolved" | "cancelled" | "queue_update";
type MessageSenderKind = "customer" | "ava" | "support_agent" | "system";
type CustomerRating = "thumbs_up" | "thumbs_down";

export interface ManagerOverviewResult {
  range: {
    from: string;
    to: string;
    preset: ManagerDateRange["preset"];
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
    preset: ManagerDateRange["preset"];
    tz: string;
  };
  agents: ManagerAgentRecord[];
}

export interface ManagerHandoffRecord {
  requestId: string;
  conversationId: string;
  customerName: string;
  customerAvatarUrl: string | null;
  previewText: string;
  status: ManagerPipelineStatus;
  requestedAt: string;
  claimedAt: string | null;
  resolvedAt: string | null;
  assignedAgentId: string | null;
  assignedAgentName: string | null;
  assignedAgentAvatarUrl: string | null;
  isEnded: boolean;
  customerRating: CustomerRating | null;
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
    preset: ManagerDateRange["preset"];
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

export interface ManagerConfigUpdateBody {
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
}

export interface ManagerReassignBody {
  requestId?: string;
  targetAgentId?: string;
  reason?: string;
}

export interface ManagerReassignResult {
  requestId: string;
  conversationId: string;
  previousAgentId: string | null;
  targetAgentId: string;
  targetAgentName: string;
  reassignedAt: string;
}

interface HandoffRequestRow {
  id: string;
  conversation_id: string;
  status: QueueStatus | "cancelled";
  reason: string | null;
  requested_at: string;
  claimed_at: string | null;
  claimed_by_auth_user_id: string | null;
  resolved_at: string | null;
}

interface ConversationRow {
  id: string;
  customer_auth_user_id: string;
  status: ConversationStatus;
  handoff_state: HandoffState;
  channel: string | null;
  subject: string | null;
  active_support_agent_auth_user_id: string | null;
  created_at: string;
  updated_at: string;
  last_message_at: string | null;
}

interface MessageRow {
  id: string;
  conversation_id: string;
  sender_kind: MessageSenderKind;
  sender_auth_user_id: string | null;
  body: string;
  payload: Record<string, unknown> | null;
  created_at: string;
}

interface HandoffEventRow {
  id: string;
  handoff_request_id: string;
  conversation_id: string;
  event_type: HandoffEventType;
  actor_auth_user_id: string | null;
  payload: Record<string, unknown> | null;
  created_at: string;
}

interface ProfileRow {
  id: string;
  full_name: string | null;
  preferred_name: string | null;
  profile_photo_url: string | null;
  email: string | null;
}

interface DepartmentHierarchyRow {
  id: string;
  name: string | null;
  parent_id: string | null;
}

interface AgentDirectoryProfileRow {
  id: string;
  employment_status: string | null;
}

const MAX_ACTIVITY_ROWS = 200;

const DEFAULT_MANAGER_CONFIG: ManagerConfig = {
  timezone: "America/Chicago",
  workingHours: {
    enabled: true,
    weekdays: [1, 2, 3, 4, 5],
    startHour24: 8,
    endHour24: 18
  },
  thresholds: {
    slowFirstReplyMinutes: 5,
    stalledConversationMinutes: 12
  }
};

const managerConfigState: {
  config: ManagerConfig;
  updatedAt: string | null;
  updatedBy: string | null;
} = {
  config: structuredClone(DEFAULT_MANAGER_CONFIG),
  updatedAt: null,
  updatedBy: null
};

function parseIsoToMs(value: string | null | undefined) {
  if (!value) {
    return null;
  }
  const parsed = new Date(value).getTime();
  if (Number.isNaN(parsed)) {
    return null;
  }
  return parsed;
}

function toSeconds(startMs: number | null, endMs: number | null) {
  if (startMs === null || endMs === null || endMs < startMs) {
    return null;
  }
  return Math.floor((endMs - startMs) / 1000);
}

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function sensitivityBand(score: number): "low" | "medium" | "high" {
  if (score >= 70) {
    return "high";
  }
  if (score >= 40) {
    return "medium";
  }
  return "low";
}

function averageNumber(values: number[]) {
  if (values.length === 0) {
    return null;
  }
  const total = values.reduce((sum, value) => sum + value, 0);
  return total / values.length;
}

function toRounded(value: number | null, digits = 2) {
  if (value === null) {
    return null;
  }
  const power = 10 ** digits;
  return Math.round(value * power) / power;
}

function parseCustomerRating(payload: Record<string, unknown> | null): CustomerRating | null {
  if (!payload || payload.kind !== "customer_rating") {
    return null;
  }
  const rating = typeof payload.rating === "string" ? payload.rating : null;
  if (rating === "thumbs_up" || rating === "thumbs_down") {
    return rating;
  }
  return null;
}

function parseCustomerName(subject: string | null | undefined, fallback: string) {
  const trimmed = subject?.trim();
  if (!trimmed) {
    return fallback;
  }
  if (trimmed.toLowerCase().startsWith("impersonation test:")) {
    return trimmed.replace(/^Impersonation test:\s*/i, "").trim() || fallback;
  }
  return fallback;
}

function getPreviewText(message: MessageRow | null) {
  const body = message?.body?.trim();
  return body && body.length > 0 ? body : "No messages yet.";
}

function isAgentTransferRequestsUnavailableError(error: unknown) {
  if (!error || typeof error !== "object") {
    return false;
  }

  const code = "code" in error ? (error as { code?: string }).code : undefined;
  if (code === "42P01") {
    return true;
  }

  const message = "message" in error ? (error as { message?: string }).message : undefined;
  if (typeof message !== "string") {
    return false;
  }

  const normalized = message.toLowerCase();
  return (
    normalized.includes("agent_transfer_requests") &&
    (normalized.includes("schema cache") ||
      normalized.includes("could not find the table") ||
      normalized.includes("does not exist"))
  );
}

function isEmployeeConversation(
  row: ConversationRow | undefined,
  profileById: Map<string, ProfileRow>
) {
  if (!row) {
    return false;
  }
  if (row.channel === "agent_impersonation") {
    return true;
  }
  const profile = profileById.get(row.customer_auth_user_id);
  const email = profile?.email?.trim().toLowerCase();
  return Boolean(email && email.endsWith("@aveyo.com"));
}

async function isOperationsManager(userId: string): Promise<boolean> {
  const supabase = getSupabaseServiceRoleClient();
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("is_manager, department_id")
    .eq("id", userId)
    .maybeSingle();

  if (profileError || !profile?.is_manager || !profile.department_id) {
    return false;
  }

  const { data: departments, error: deptError } = await supabase
    .from("departments")
    .select("id, name, parent_id")
    .limit(5000);

  if (deptError || !departments) {
    return false;
  }

  const departmentById = new Map(
    (departments as DepartmentHierarchyRow[]).map((row) => [row.id, row])
  );

  let cursor = departmentById.get(profile.department_id);
  const visited = new Set<string>();
  while (cursor && !visited.has(cursor.id)) {
    if (cursor.name?.trim().toLowerCase() === "operations") {
      return true;
    }
    visited.add(cursor.id);
    cursor = cursor.parent_id ? departmentById.get(cursor.parent_id) : undefined;
  }

  return false;
}

async function checkManagerAccess(actorUserId: string, actorRole: AppRole) {
  if (actorRole === "super_admin") {
    return;
  }

  const supabase = getSupabaseServiceRoleClient();
  const { data, error } = await supabase.rpc("is_admin_like", {
    p_user_id: actorUserId
  });
  if (error) {
    throw new ServiceError(500, `Unable to resolve manager access: ${error.message}`);
  }
  if (data) {
    return;
  }

  if (await isOperationsManager(actorUserId)) {
    return;
  }

  throw new ServiceError(403, "Manager dashboard access required.");
}

async function fetchHandoffRequests() {
  const supabase = getSupabaseServiceRoleClient();
  const { data, error } = await supabase
    .schema("ava")
    .from("handoff_requests")
    .select(
      "id, conversation_id, status, reason, requested_at, claimed_at, claimed_by_auth_user_id, resolved_at"
    )
    .neq("status", "cancelled")
    .order("requested_at", { ascending: false })
    .limit(5000);

  if (error) {
    throw new ServiceError(500, `Unable to load handoff requests: ${error.message}`);
  }
  const handoffRequests = (data ?? []) as HandoffRequestRow[];
  if (handoffRequests.length === 0) {
    return [];
  }

  const conversationById = await fetchConversationsByIds(
    Array.from(new Set(handoffRequests.map((request) => request.conversation_id)))
  );
  const seenOpenCustomerIds = new Set<string>();

  return handoffRequests.filter((request) => {
    const isOpenStatus =
      request.status === "pending" || request.status === "claimed" || request.status === "active";
    if (!isOpenStatus) {
      return true;
    }

    const conversation = conversationById.get(request.conversation_id);
    if (!conversation || conversation.channel === "agent_impersonation") {
      return true;
    }

    const customerId = conversation.customer_auth_user_id;
    if (!customerId) {
      return true;
    }

    if (seenOpenCustomerIds.has(customerId)) {
      return false;
    }
    seenOpenCustomerIds.add(customerId);
    return true;
  });
}

async function fetchConversationsByIds(conversationIds: string[]) {
  if (conversationIds.length === 0) {
    return new Map<string, ConversationRow>();
  }

  const supabase = getSupabaseServiceRoleClient();
  const { data, error } = await supabase
    .schema("ava")
    .from("conversations")
    .select(
      "id, customer_auth_user_id, status, handoff_state, channel, subject, active_support_agent_auth_user_id, created_at, updated_at, last_message_at"
    )
    .in("id", conversationIds);

  if (error) {
    throw new ServiceError(500, `Unable to load conversations: ${error.message}`);
  }

  const result = new Map<string, ConversationRow>();
  for (const row of (data ?? []) as ConversationRow[]) {
    result.set(row.id, row);
  }
  return result;
}

async function fetchOpenAiConversations() {
  const supabase = getSupabaseServiceRoleClient();
  const { data, error } = await supabase
    .schema("ava")
    .from("conversations")
    .select(
      "id, customer_auth_user_id, status, handoff_state, channel, subject, active_support_agent_auth_user_id, created_at, updated_at, last_message_at"
    )
    .eq("status", "open")
    .eq("handoff_state", "none")
    .neq("channel", "agent_impersonation")
    .order("updated_at", { ascending: false })
    .limit(500);

  if (error) {
    throw new ServiceError(500, `Unable to load open AI conversations: ${error.message}`);
  }

  const rows = (data ?? []) as ConversationRow[];
  const seenCustomerIds = new Set<string>();
  const deduped: ConversationRow[] = [];
  for (const row of rows) {
    if (!row.customer_auth_user_id || seenCustomerIds.has(row.customer_auth_user_id)) {
      continue;
    }
    seenCustomerIds.add(row.customer_auth_user_id);
    deduped.push(row);
  }
  return deduped.slice(0, MAX_ACTIVITY_ROWS);
}

async function fetchEndedAiConversations(range: ManagerDateRange) {
  const supabase = getSupabaseServiceRoleClient();
  const { data, error } = await supabase
    .schema("ava")
    .from("conversations")
    .select(
      "id, customer_auth_user_id, status, handoff_state, channel, subject, active_support_agent_auth_user_id, created_at, updated_at, last_message_at"
    )
    .eq("status", "closed")
    .eq("handoff_state", "resolved")
    .neq("channel", "agent_impersonation")
    .gte("created_at", range.fromIso)
    .lt("created_at", range.toIso)
    .order("updated_at", { ascending: false })
    .limit(500);

  if (error) {
    throw new ServiceError(500, `Unable to load ended AI conversations: ${error.message}`);
  }

  return ((data ?? []) as ConversationRow[]).slice(0, MAX_ACTIVITY_ROWS);
}

async function fetchResolvedOrEndedConversations(range: ManagerDateRange) {
  const supabase = getSupabaseServiceRoleClient();
  const { data, error } = await supabase
    .schema("ava")
    .from("conversations")
    .select(
      "id, customer_auth_user_id, status, handoff_state, channel, subject, active_support_agent_auth_user_id, created_at, updated_at, last_message_at"
    )
    .in("status", ["resolved", "closed"])
    .eq("handoff_state", "resolved")
    .neq("channel", "agent_impersonation")
    .gte("updated_at", range.fromIso)
    .lt("updated_at", range.toIso)
    .order("updated_at", { ascending: false })
    .limit(5000);

  if (error) {
    throw new ServiceError(500, `Unable to load resolved or ended conversations: ${error.message}`);
  }

  return (data ?? []) as ConversationRow[];
}

async function fetchMessagesInRange(range: ManagerDateRange) {
  const supabase = getSupabaseServiceRoleClient();
  const { data, error } = await supabase
    .schema("ava")
    .from("messages")
    .select("id, conversation_id, sender_kind, sender_auth_user_id, body, payload, created_at")
    .gte("created_at", range.fromIso)
    .lt("created_at", range.toIso)
    .in("sender_kind", ["customer", "support_agent"])
    .order("created_at", { ascending: false })
    .limit(10000);

  if (error) {
    throw new ServiceError(500, `Unable to load range messages: ${error.message}`);
  }

  return (data ?? []) as MessageRow[];
}

async function fetchMessagesByConversationIds(conversationIds: string[]) {
  if (conversationIds.length === 0) {
    return [];
  }

  const supabase = getSupabaseServiceRoleClient();
  const { data, error } = await supabase
    .schema("ava")
    .from("messages")
    .select("id, conversation_id, sender_kind, sender_auth_user_id, body, payload, created_at")
    .in("conversation_id", conversationIds)
    .order("created_at", { ascending: true })
    .limit(10000);

  if (error) {
    throw new ServiceError(500, `Unable to load handoff conversation messages: ${error.message}`);
  }

  return (data ?? []) as MessageRow[];
}

async function fetchProfilesByIds(profileIds: string[]) {
  if (profileIds.length === 0) {
    return new Map<string, ProfileRow>();
  }

  const supabase = getSupabaseServiceRoleClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, preferred_name, profile_photo_url, email")
    .in("id", profileIds);

  if (error) {
    throw new ServiceError(500, `Unable to load profiles: ${error.message}`);
  }

  const result = new Map<string, ProfileRow>();
  for (const row of (data ?? []) as ProfileRow[]) {
    result.set(row.id, row);
  }
  return result;
}

function isActiveEmployee(employmentStatus: string | null | undefined) {
  const normalized = employmentStatus?.trim().toLowerCase();
  return !normalized || normalized === "active";
}

async function fetchCustomerCareAndAdminAgentIds() {
  const supabase = getSupabaseServiceRoleClient();

  const { data: departmentData, error: departmentError } = await supabase
    .from("departments")
    .select("id, name, parent_id")
    .limit(5000);
  if (departmentError) {
    throw new ServiceError(500, `Unable to load departments: ${departmentError.message}`);
  }

  const departments = (departmentData ?? []) as DepartmentHierarchyRow[];
  const customerCareRootIds = departments
    .filter((row) => row.name?.trim().toLowerCase() === "customer care")
    .map((row) => row.id);
  const customerCareDepartmentIds = new Set<string>(customerCareRootIds);

  if (customerCareRootIds.length > 0) {
    const childrenByParentId = new Map<string, DepartmentHierarchyRow[]>();
    for (const department of departments) {
      if (!department.parent_id) {
        continue;
      }
      const children = childrenByParentId.get(department.parent_id) ?? [];
      children.push(department);
      childrenByParentId.set(department.parent_id, children);
    }

    const stack = [...customerCareRootIds];
    while (stack.length > 0) {
      const currentId = stack.pop();
      if (!currentId) {
        continue;
      }
      const children = childrenByParentId.get(currentId) ?? [];
      for (const child of children) {
        if (customerCareDepartmentIds.has(child.id)) {
          continue;
        }
        customerCareDepartmentIds.add(child.id);
        stack.push(child.id);
      }
    }
  }

  const { data: adminLikeData, error: adminLikeError } = await supabase
    .from("profiles")
    .select("id, employment_status")
    .or("is_admin.eq.true,is_super_admin.eq.true");
  if (adminLikeError) {
    throw new ServiceError(500, `Unable to load admin agents: ${adminLikeError.message}`);
  }

  let customerCareData: AgentDirectoryProfileRow[] = [];
  if (customerCareDepartmentIds.size > 0) {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, employment_status")
      .in("department_id", Array.from(customerCareDepartmentIds));
    if (error) {
      throw new ServiceError(500, `Unable to load customer-care agents: ${error.message}`);
    }
    customerCareData = (data ?? []) as AgentDirectoryProfileRow[];
  }

  const eligibleAgentIds = new Set<string>();
  for (const row of [...((adminLikeData ?? []) as AgentDirectoryProfileRow[]), ...customerCareData]) {
    if (!row.id || !isActiveEmployee(row.employment_status)) {
      continue;
    }
    eligibleAgentIds.add(row.id);
  }

  return Array.from(eligibleAgentIds);
}

async function fetchHandoffEventsByRequestIds(requestIds: string[]) {
  if (requestIds.length === 0) {
    return [];
  }

  const supabase = getSupabaseServiceRoleClient();
  const { data, error } = await supabase
    .schema("ava")
    .from("handoff_events")
    .select("id, handoff_request_id, conversation_id, event_type, actor_auth_user_id, payload, created_at")
    .in("handoff_request_id", requestIds)
    .order("created_at", { ascending: false })
    .limit(12000);

  if (error) {
    throw new ServiceError(500, `Unable to load handoff events: ${error.message}`);
  }
  return (data ?? []) as HandoffEventRow[];
}

function getProfileDisplayName(profile: ProfileRow | undefined, fallback = "Agent") {
  if (!profile) {
    return fallback;
  }
  const fullName = profile.full_name?.trim();
  if (fullName) {
    return fullName;
  }
  const preferredName = profile.preferred_name?.trim();
  if (preferredName) {
    return preferredName;
  }
  const email = profile.email?.trim();
  if (email) {
    return email.split("@")[0] || fallback;
  }
  return fallback;
}

function getLatestEventMaps(events: HandoffEventRow[]) {
  const resolvedByRequest = new Map<string, string>();
  const ratingByRequest = new Map<
    string,
    {
      rating: CustomerRating;
      createdAt: string;
    }
  >();

  for (const event of events) {
    if (event.event_type === "resolved" && event.actor_auth_user_id && !resolvedByRequest.has(event.handoff_request_id)) {
      resolvedByRequest.set(event.handoff_request_id, event.actor_auth_user_id);
    }

    if (event.event_type === "queue_update" && !ratingByRequest.has(event.handoff_request_id)) {
      const rating = parseCustomerRating(event.payload);
      if (rating) {
        ratingByRequest.set(event.handoff_request_id, {
          rating,
          createdAt: event.created_at
        });
      }
    }
  }

  return {
    resolvedByRequest,
    ratingByRequest
  };
}

function computeCustomerSensitivity(params: {
  customerMessages: MessageRow[];
  staleMinutes: number | null;
  rating: CustomerRating | null;
}) {
  return computeOverallCustomerSentiment({
    customerMessages: params.customerMessages,
    staleMinutes: params.staleMinutes,
    rating: params.rating
  });
}

function computeAgentSensitivity(params: {
  firstReplySeconds: number | null;
  staleMinutes: number | null;
  rating: CustomerRating | null;
  slowFirstReplyMinutes: number;
  stalledConversationMinutes: number;
}) {
  let score = 12;
  if (
    params.firstReplySeconds !== null &&
    params.firstReplySeconds > params.slowFirstReplyMinutes * 60
  ) {
    score += Math.min(30, Math.floor(params.firstReplySeconds / 60));
  }
  if (
    params.staleMinutes !== null &&
    params.staleMinutes > params.stalledConversationMinutes
  ) {
    score += Math.min(30, Math.floor(params.staleMinutes));
  }
  if (params.rating === "thumbs_down") {
    score += 18;
  }
  if (params.rating === "thumbs_up") {
    score -= 5;
  }

  return clampScore(score);
}

function getRangePayload(range: ManagerDateRange) {
  return {
    from: range.fromIso,
    to: range.toIso,
    preset: range.preset,
    tz: range.tz
  };
}

async function buildManagerOverview(
  range: ManagerDateRange
): Promise<ManagerOverviewResult> {
  const [handoffRequests, rangeMessages, resolvedOrEndedConversations] = await Promise.all([
    fetchHandoffRequests(),
    fetchMessagesInRange(range),
    fetchResolvedOrEndedConversations(range)
  ]);

  const activeHandoffsNow = handoffRequests.filter(
    (row) => row.status === "active" || row.status === "claimed"
  ).length;
  const pendingHandoffsNow = handoffRequests.filter((row) => row.status === "pending").length;
  const rangedHandoffs = handoffRequests.filter((row) => {
    const requestedAtMs = parseIsoToMs(row.requested_at);
    return (
      requestedAtMs !== null &&
      requestedAtMs >= range.from.getTime() &&
      requestedAtMs < range.to.getTime()
    );
  });

  const customerMessages = rangeMessages.filter((message) => message.sender_kind === "customer");
  const conversationIds = Array.from(new Set(customerMessages.map((message) => message.conversation_id)));
  const conversationMap = await fetchConversationsByIds(conversationIds);
  const customerProfileIds = Array.from(
    new Set(
      Array.from(conversationMap.values())
        .map((row) => row.customer_auth_user_id)
        .filter(Boolean)
    )
  );
  const customerProfileById = await fetchProfilesByIds(customerProfileIds);

  const customerConversationIds = new Set<string>();
  const employeeConversationIds = new Set<string>();
  for (const conversationId of conversationIds) {
    const conversation = conversationMap.get(conversationId);
    if (isEmployeeConversation(conversation, customerProfileById)) {
      employeeConversationIds.add(conversationId);
      continue;
    }
    customerConversationIds.add(conversationId);
  }

  const totalChats = customerConversationIds.size + employeeConversationIds.size;
  const handoffRate = totalChats > 0 ? rangedHandoffs.length / totalChats : 0;
  const allHandoffConversationIds = new Set(handoffRequests.map((row) => row.conversation_id));
  const aiEndedOrResolvedWithoutHandoff = resolvedOrEndedConversations.filter(
    (conversation) => !allHandoffConversationIds.has(conversation.id)
  ).length;
  const endedOrResolvedWithHandoff =
    resolvedOrEndedConversations.length - aiEndedOrResolvedWithoutHandoff;
  const totalEndedOrResolvedChats = resolvedOrEndedConversations.length;

  const containmentRate =
    totalEndedOrResolvedChats > 0
      ? aiEndedOrResolvedWithoutHandoff / totalEndedOrResolvedChats
      : 0;

  const events = await fetchHandoffEventsByRequestIds(rangedHandoffs.map((row) => row.id));
  const { ratingByRequest } = getLatestEventMaps(events);
  const sensitivityCustomerScores: number[] = [];
  const sensitivityAgentScores: number[] = [];

  for (const handoff of rangedHandoffs) {
    const conversationMessages = customerMessages.filter(
      (message) => message.conversation_id === handoff.conversation_id
    );
    const rating = ratingByRequest.get(handoff.id)?.rating ?? null;
    const customerScore = computeCustomerSensitivity({
      customerMessages: conversationMessages,
      staleMinutes: null,
      rating
    });
    const agentScore = computeAgentSensitivity({
      firstReplySeconds: null,
      staleMinutes: null,
      rating,
      slowFirstReplyMinutes: managerConfigState.config.thresholds.slowFirstReplyMinutes,
      stalledConversationMinutes: managerConfigState.config.thresholds.stalledConversationMinutes
    });
    sensitivityCustomerScores.push(customerScore);
    sensitivityAgentScores.push(agentScore);
  }

  return {
    range: getRangePayload(range),
    metrics: {
      customerChatsWithAva: customerConversationIds.size,
      employeeChatsWithAva: employeeConversationIds.size,
      handoffsToAgent: rangedHandoffs.length,
      activeHandoffsNow,
      pendingHandoffsNow,
      handoffRate: toRounded(handoffRate, 4) ?? 0,
      containmentRate: toRounded(containmentRate, 4) ?? 0,
      aiEndedOrResolvedWithoutHandoff,
      endedOrResolvedWithHandoff,
      totalEndedOrResolvedChats
    },
    sensitivitySummary: {
      customerAverageScore: toRounded(averageNumber(sensitivityCustomerScores), 1) ?? 0,
      agentAverageScore: toRounded(averageNumber(sensitivityAgentScores), 1) ?? 0,
      highRiskCustomers: sensitivityCustomerScores.filter((score) => score >= 70).length,
      highRiskAgents: sensitivityAgentScores.filter((score) => score >= 70).length
    }
  };
}

async function buildManagerAgents(
  range: ManagerDateRange
): Promise<ManagerAgentsResult> {
  const [directoryAgentIds, handoffRequests] = await Promise.all([
    fetchCustomerCareAndAdminAgentIds(),
    fetchHandoffRequests()
  ]);
  const [events, rangeMessages] = await Promise.all([
    fetchHandoffEventsByRequestIds(handoffRequests.map((row) => row.id)),
    fetchMessagesInRange(range)
  ]);
  const { resolvedByRequest, ratingByRequest } = getLatestEventMaps(events);

  const historicalAgentIds = new Set<string>(
    handoffRequests
      .map((row) => row.claimed_by_auth_user_id)
      .filter((value): value is string => Boolean(value))
  );
  for (const message of rangeMessages) {
    if (message.sender_kind === "support_agent" && message.sender_auth_user_id) {
      historicalAgentIds.add(message.sender_auth_user_id);
    }
  }
  const allAgentIds = Array.from(new Set([...historicalAgentIds, ...directoryAgentIds]));
  const onlineAgentIds = await getOnlineSupportAgentIds(allAgentIds);
  const profileById = await fetchProfilesByIds(allAgentIds);

  const ratingValuesByAgent = new Map<string, number[]>();
  const firstReplySecondsByAgent = new Map<string, number[]>();
  const resolutionSecondsByAgent = new Map<string, number[]>();
  const sensitivityByAgent = new Map<string, number[]>();

  for (const request of handoffRequests) {
    const requestedAtMs = parseIsoToMs(request.requested_at);
    const claimedAtMs = parseIsoToMs(request.claimed_at);
    const resolvedAtMs = parseIsoToMs(request.resolved_at);
    if (requestedAtMs === null) {
      continue;
    }

    const inRange = requestedAtMs >= range.from.getTime() && requestedAtMs < range.to.getTime();
    if (!inRange) {
      continue;
    }

    const resolvedByAgentId =
      resolvedByRequest.get(request.id) ?? request.claimed_by_auth_user_id ?? null;
    const ratingInfo = ratingByRequest.get(request.id);
    const rating = ratingInfo?.rating ?? null;
    const ratingAgentId = resolvedByAgentId ?? request.claimed_by_auth_user_id ?? null;
    if (ratingAgentId && ratingInfo) {
      const values = ratingValuesByAgent.get(ratingAgentId) ?? [];
      values.push(ratingInfo.rating === "thumbs_up" ? 5 : 1);
      ratingValuesByAgent.set(ratingAgentId, values);
    }

    if (request.claimed_by_auth_user_id && claimedAtMs !== null) {
      const firstReplySeconds = toSeconds(claimedAtMs, resolvedAtMs ?? null);
      if (firstReplySeconds !== null) {
        const values = firstReplySecondsByAgent.get(request.claimed_by_auth_user_id) ?? [];
        values.push(firstReplySeconds);
        firstReplySecondsByAgent.set(request.claimed_by_auth_user_id, values);
      }
    }

    if (resolvedByAgentId && claimedAtMs !== null && resolvedAtMs !== null) {
      const resolutionSeconds = toSeconds(claimedAtMs, resolvedAtMs);
      if (resolutionSeconds !== null) {
        const values = resolutionSecondsByAgent.get(resolvedByAgentId) ?? [];
        values.push(resolutionSeconds);
        resolutionSecondsByAgent.set(resolvedByAgentId, values);
      }
    }

    const sensitivityScore = computeAgentSensitivity({
      firstReplySeconds: toSeconds(claimedAtMs, resolvedAtMs ?? null),
      staleMinutes: null,
      rating,
      slowFirstReplyMinutes: managerConfigState.config.thresholds.slowFirstReplyMinutes,
      stalledConversationMinutes: managerConfigState.config.thresholds.stalledConversationMinutes
    });
    if (request.claimed_by_auth_user_id) {
      const values = sensitivityByAgent.get(request.claimed_by_auth_user_id) ?? [];
      values.push(sensitivityScore);
      sensitivityByAgent.set(request.claimed_by_auth_user_id, values);
    }
  }

  const activeCountByAgent = new Map<string, number>();
  for (const request of handoffRequests) {
    if ((request.status === "active" || request.status === "claimed") && request.claimed_by_auth_user_id) {
      activeCountByAgent.set(
        request.claimed_by_auth_user_id,
        (activeCountByAgent.get(request.claimed_by_auth_user_id) ?? 0) + 1
      );
    }
  }

  const agents = allAgentIds
    .map<ManagerAgentRecord>((agentId) => {
      const ratingValues = ratingValuesByAgent.get(agentId) ?? [];
      const avgRating = averageNumber(ratingValues);
      const avgFirstReplySeconds = averageNumber(firstReplySecondsByAgent.get(agentId) ?? []);
      const avgResolutionSeconds = averageNumber(resolutionSecondsByAgent.get(agentId) ?? []);
      const sensitivityScore = toRounded(averageNumber(sensitivityByAgent.get(agentId) ?? []), 1) ?? 0;

      return {
        agentId,
        name: getProfileDisplayName(profileById.get(agentId)),
        avatarUrl: profileById.get(agentId)?.profile_photo_url?.trim() || null,
        status: onlineAgentIds.has(agentId) ? "online" : "offline",
        activeHandoffs: activeCountByAgent.get(agentId) ?? 0,
        avgRating: toRounded(avgRating, 2),
        ratingCount: ratingValues.length,
        avgFirstReplySeconds: toRounded(avgFirstReplySeconds, 0),
        avgResolutionSeconds: toRounded(avgResolutionSeconds, 0),
        sensitivityScore,
        sensitivityBand: sensitivityBand(sensitivityScore)
      };
    })
    .sort((left, right) => {
      if (left.status !== right.status) {
        return left.status === "online" ? -1 : 1;
      }
      if (left.activeHandoffs !== right.activeHandoffs) {
        return right.activeHandoffs - left.activeHandoffs;
      }
      return left.name.localeCompare(right.name);
    });

  return {
    range: getRangePayload(range),
    agents
  };
}

async function buildManagerHandoffs(
  range: ManagerDateRange
): Promise<ManagerHandoffsResult> {
  const [handoffRequests, openAiConversations, endedAiConversations] = await Promise.all([
    fetchHandoffRequests(),
    fetchOpenAiConversations(),
    fetchEndedAiConversations(range)
  ]);
  const anyHandoffConversationIds = new Set(handoffRequests.map((row) => row.conversation_id));
  const openHandoffConversationIds = new Set(
    handoffRequests
      .filter((row) => row.status === "pending" || row.status === "claimed" || row.status === "active")
      .map((row) => row.conversation_id)
  );
  const openHandoffConversations = await fetchConversationsByIds(Array.from(openHandoffConversationIds));
  const openHandoffCustomerIds = new Set(
    Array.from(openHandoffConversations.values())
      .map((conversation) => conversation.customer_auth_user_id)
      .filter(Boolean)
  );

  const filtered = handoffRequests.filter((row) => {
    const requestedAtMs = parseIsoToMs(row.requested_at);
    const inRangeRequested =
      requestedAtMs !== null &&
      requestedAtMs >= range.from.getTime() &&
      requestedAtMs < range.to.getTime();

    return inRangeRequested || row.status === "active" || row.status === "claimed";
  });

  const topRows = filtered.slice(0, MAX_ACTIVITY_ROWS);
  const events = await fetchHandoffEventsByRequestIds(topRows.map((row) => row.id));
  const { resolvedByRequest, ratingByRequest } = getLatestEventMaps(events);
  const handoffConversationIds = new Set(topRows.map((row) => row.conversation_id));
  const aiOnlyConversations = openAiConversations.filter(
    (conversation) =>
      !handoffConversationIds.has(conversation.id) &&
      !openHandoffConversationIds.has(conversation.id) &&
      !openHandoffCustomerIds.has(conversation.customer_auth_user_id)
  );
  const endedAiOnlyConversations = endedAiConversations.filter(
    (conversation) => !anyHandoffConversationIds.has(conversation.id)
  );
  const conversationIds = Array.from(
    new Set([
      ...topRows.map((row) => row.conversation_id),
      ...aiOnlyConversations.map((conversation) => conversation.id),
      ...endedAiOnlyConversations.map((conversation) => conversation.id)
    ])
  );
  const [conversationById, messages] = await Promise.all([
    fetchConversationsByIds(conversationIds),
    fetchMessagesByConversationIds(conversationIds)
  ]);

  const customerAuthUserIds = Array.from(
    new Set(
      Array.from(conversationById.values())
        .map((row) => row.customer_auth_user_id)
        .filter(Boolean)
    )
  );

  const allAgentIds = Array.from(
    new Set(
      topRows
        .map((row) => resolvedByRequest.get(row.id) ?? row.claimed_by_auth_user_id)
        .filter((value): value is string => Boolean(value))
    )
  );
  const [customerProfiles, agentProfiles] = await Promise.all([
    fetchProfilesByIds(customerAuthUserIds),
    fetchProfilesByIds(allAgentIds)
  ]);

  const messagesByConversation = new Map<string, MessageRow[]>();
  for (const message of messages) {
    const list = messagesByConversation.get(message.conversation_id) ?? [];
    list.push(message);
    messagesByConversation.set(message.conversation_id, list);
  }
  const startedAiOnlyConversations = aiOnlyConversations.filter((conversation) => {
    const conversationMessages = messagesByConversation.get(conversation.id) ?? [];
    // A real AI session starts when the customer sends the first message.
    return conversationMessages.some((message) => message.sender_kind === "customer");
  });
  const startedEndedAiOnlyConversations = endedAiOnlyConversations.filter((conversation) => {
    const conversationMessages = messagesByConversation.get(conversation.id) ?? [];
    // Avoid rendering synthetic/empty rows in resolved lane.
    return conversationMessages.some((message) => message.sender_kind === "customer");
  });

  const nowMs = Date.now();
  const handoffRecords = topRows.map<ManagerHandoffRecord>((row) => {
    const conversation = conversationById.get(row.conversation_id);
    const conversationMessages = messagesByConversation.get(row.conversation_id) ?? [];
    const claimedAtMs = parseIsoToMs(row.claimed_at);
    const resolvedAtMs = parseIsoToMs(row.resolved_at);
    const firstReplyMessage = conversationMessages.find(
      (message) =>
        message.sender_kind === "support_agent" &&
        claimedAtMs !== null &&
        (parseIsoToMs(message.created_at) ?? 0) >= claimedAtMs
    );
    const lastMessage = conversationMessages[conversationMessages.length - 1];
    const lastRelevantMessage =
      resolvedAtMs !== null
        ? [...conversationMessages]
            .reverse()
            .find((message) => {
              const messageAtMs = parseIsoToMs(message.created_at);
              return messageAtMs !== null && messageAtMs <= resolvedAtMs;
            }) ?? null
        : null;
    const lastVisibleMessage = lastRelevantMessage ?? lastMessage;
    const lastMessageAtMs = parseIsoToMs(lastVisibleMessage?.created_at);
    const staleMinutes =
      row.status === "active" || row.status === "claimed"
        ? (() => {
            if (lastMessageAtMs === null) {
              return null;
            }
            return Math.max(0, Math.floor((nowMs - lastMessageAtMs) / 60000));
          })()
        : null;
    const firstReplyAtMs = parseIsoToMs(firstReplyMessage?.created_at);
    const firstReplySeconds = toSeconds(claimedAtMs, firstReplyAtMs);
    const resolutionSeconds = toSeconds(claimedAtMs, resolvedAtMs);
    const rating = ratingByRequest.get(row.id)?.rating ?? null;
    const customerMessages = conversationMessages.filter((message) => message.sender_kind === "customer");
    const customerSensitivityScore = computeCustomerSensitivity({
      customerMessages,
      staleMinutes,
      rating
    });
    const agentSensitivityScore = computeAgentSensitivity({
      firstReplySeconds,
      staleMinutes,
      rating,
      slowFirstReplyMinutes: managerConfigState.config.thresholds.slowFirstReplyMinutes,
      stalledConversationMinutes: managerConfigState.config.thresholds.stalledConversationMinutes
    });
    const assignedAgentId = row.claimed_by_auth_user_id;
    const resolvedActor = resolvedByRequest.get(row.id) ?? assignedAgentId;
    const assignedProfile = assignedAgentId ? agentProfiles.get(assignedAgentId) : undefined;
    const customerProfile = conversation
      ? customerProfiles.get(conversation.customer_auth_user_id)
      : undefined;
    const resolvedProfile = resolvedActor ? agentProfiles.get(resolvedActor) : undefined;

    const customerFallbackName = customerProfile?.full_name?.trim() || customerProfile?.email?.trim() || "Customer";
    const customerName = parseCustomerName(conversation?.subject, customerFallbackName);
    const previewText = getPreviewText(lastVisibleMessage);
    const slowFirstReply =
      firstReplySeconds !== null &&
      firstReplySeconds > managerConfigState.config.thresholds.slowFirstReplyMinutes * 60;
    const needsAttention =
      (row.status === "active" || row.status === "claimed") &&
      ((staleMinutes !== null &&
        staleMinutes >= managerConfigState.config.thresholds.stalledConversationMinutes) ||
        slowFirstReply);

    return {
      requestId: row.id,
      conversationId: row.conversation_id,
      customerName,
      customerAvatarUrl: customerProfile?.profile_photo_url?.trim() || null,
      previewText,
      status: row.status === "cancelled" ? "resolved" : row.status,
      requestedAt: row.requested_at,
      claimedAt: row.claimed_at,
      resolvedAt: row.resolved_at,
      assignedAgentId,
      assignedAgentName: assignedAgentId
        ? getProfileDisplayName(assignedProfile)
        : resolvedActor
          ? getProfileDisplayName(resolvedProfile)
          : null,
      assignedAgentAvatarUrl:
        assignedProfile?.profile_photo_url?.trim() || resolvedProfile?.profile_photo_url?.trim() || null,
      isEnded: conversation?.status === "closed",
      customerRating: rating,
      firstReplyAt: firstReplyMessage?.created_at ?? null,
      firstReplySeconds,
      resolutionSeconds,
      lastMessageAt: lastVisibleMessage?.created_at ?? row.resolved_at ?? null,
      staleMinutes,
      slowFirstReply,
      needsAttention,
      customerSensitivityScore,
      customerSensitivityBand: sensitivityBand(customerSensitivityScore),
      agentSensitivityScore,
      agentSensitivityBand: sensitivityBand(agentSensitivityScore)
    };
  });

  const aiHandlingRecords = startedAiOnlyConversations.map<ManagerHandoffRecord>((conversation) => {
    const normalizedConversation = conversationById.get(conversation.id) ?? conversation;
    const conversationMessages = messagesByConversation.get(normalizedConversation.id) ?? [];
    const lastMessage = conversationMessages[conversationMessages.length - 1];
    const fallbackLastMessageAt =
      normalizedConversation.last_message_at ??
      normalizedConversation.updated_at ??
      normalizedConversation.created_at;
    const lastMessageAt = lastMessage?.created_at ?? fallbackLastMessageAt ?? null;
    const lastMessageAtMs = parseIsoToMs(lastMessageAt);
    const staleMinutes =
      lastMessageAtMs === null ? null : Math.max(0, Math.floor((nowMs - lastMessageAtMs) / 60000));
    const customerMessages = conversationMessages.filter((message) => message.sender_kind === "customer");
    const customerProfile = customerProfiles.get(normalizedConversation.customer_auth_user_id);
    const customerFallbackName =
      customerProfile?.full_name?.trim() || customerProfile?.email?.trim() || "Customer";
    const customerName = parseCustomerName(normalizedConversation.subject, customerFallbackName);
    const previewText = getPreviewText(lastMessage ?? null);
    const customerSensitivityScore = computeCustomerSensitivity({
      customerMessages,
      staleMinutes,
      rating: null
    });
    const agentSensitivityScore = computeAgentSensitivity({
      firstReplySeconds: null,
      staleMinutes,
      rating: null,
      slowFirstReplyMinutes: managerConfigState.config.thresholds.slowFirstReplyMinutes,
      stalledConversationMinutes: managerConfigState.config.thresholds.stalledConversationMinutes
    });
    const needsAttention =
      staleMinutes !== null &&
      staleMinutes >= managerConfigState.config.thresholds.stalledConversationMinutes;

    return {
      requestId: `conversation-${normalizedConversation.id}`,
      conversationId: normalizedConversation.id,
      customerName,
      customerAvatarUrl: customerProfile?.profile_photo_url?.trim() || null,
      previewText,
      status: "open",
      requestedAt:
        normalizedConversation.created_at ??
        normalizedConversation.updated_at ??
        lastMessageAt ??
        new Date().toISOString(),
      claimedAt: null,
      resolvedAt: null,
      assignedAgentId: null,
      assignedAgentName: null,
      assignedAgentAvatarUrl: null,
      isEnded: false,
      customerRating: null,
      firstReplyAt: null,
      firstReplySeconds: null,
      resolutionSeconds: null,
      lastMessageAt,
      staleMinutes,
      slowFirstReply: false,
      needsAttention,
      customerSensitivityScore,
      customerSensitivityBand: sensitivityBand(customerSensitivityScore),
      agentSensitivityScore,
      agentSensitivityBand: sensitivityBand(agentSensitivityScore)
    };
  });

  const endedAiOnlyRecords = startedEndedAiOnlyConversations.map<ManagerHandoffRecord>((conversation) => {
    const normalizedConversation = conversationById.get(conversation.id) ?? conversation;
    const conversationMessages = messagesByConversation.get(normalizedConversation.id) ?? [];
    const lastMessage = conversationMessages[conversationMessages.length - 1];
    const closedAt =
      normalizedConversation.last_message_at ??
      normalizedConversation.updated_at ??
      lastMessage?.created_at ??
      normalizedConversation.created_at;
    const lastMessageAt = lastMessage?.created_at ?? closedAt ?? null;
    const customerMessages = conversationMessages.filter((message) => message.sender_kind === "customer");
    const customerProfile = customerProfiles.get(normalizedConversation.customer_auth_user_id);
    const customerFallbackName =
      customerProfile?.full_name?.trim() || customerProfile?.email?.trim() || "Customer";
    const customerName = parseCustomerName(normalizedConversation.subject, customerFallbackName);
    const previewText = getPreviewText(lastMessage ?? null);
    const customerSensitivityScore = computeCustomerSensitivity({
      customerMessages,
      staleMinutes: null,
      rating: null
    });
    const agentSensitivityScore = computeAgentSensitivity({
      firstReplySeconds: null,
      staleMinutes: null,
      rating: null,
      slowFirstReplyMinutes: managerConfigState.config.thresholds.slowFirstReplyMinutes,
      stalledConversationMinutes: managerConfigState.config.thresholds.stalledConversationMinutes
    });

    return {
      requestId: `conversation-${normalizedConversation.id}`,
      conversationId: normalizedConversation.id,
      customerName,
      customerAvatarUrl: customerProfile?.profile_photo_url?.trim() || null,
      previewText,
      status: "resolved",
      requestedAt: normalizedConversation.created_at ?? closedAt ?? new Date().toISOString(),
      claimedAt: null,
      resolvedAt: closedAt ?? null,
      assignedAgentId: null,
      assignedAgentName: null,
      assignedAgentAvatarUrl: null,
      isEnded: true,
      customerRating: null,
      firstReplyAt: null,
      firstReplySeconds: null,
      resolutionSeconds: null,
      lastMessageAt,
      staleMinutes: null,
      slowFirstReply: false,
      needsAttention: false,
      customerSensitivityScore,
      customerSensitivityBand: sensitivityBand(customerSensitivityScore),
      agentSensitivityScore,
      agentSensitivityBand: sensitivityBand(agentSensitivityScore)
    };
  });

  const handoffs = [...handoffRecords, ...aiHandlingRecords, ...endedAiOnlyRecords];

  return {
    range: getRangePayload(range),
    handoffs
  };
}

function validateWeekdays(weekdays: number[] | undefined) {
  if (!weekdays) {
    return undefined;
  }
  const normalized = Array.from(
    new Set(
      weekdays
        .filter((day) => Number.isInteger(day) && day >= 0 && day <= 6)
        .map((day) => Math.floor(day))
    )
  ).sort((left, right) => left - right);
  if (normalized.length === 0) {
    throw new ServiceError(400, "workingHours.weekdays must include values between 0 and 6.");
  }
  return normalized;
}

function validateHour(value: number | undefined, field: string) {
  if (value === undefined) {
    return undefined;
  }
  if (!Number.isInteger(value) || value < 0 || value > 23) {
    throw new ServiceError(400, `${field} must be an integer between 0 and 23.`);
  }
  return value;
}

function validateThreshold(value: number | undefined, field: string, min: number, max: number) {
  if (value === undefined) {
    return undefined;
  }
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new ServiceError(400, `${field} must be an integer between ${min} and ${max}.`);
  }
  return value;
}

export async function getManagerOverviewResult(
  range: ManagerDateRange,
  actorUserId: string,
  actorRole: AppRole
) {
  await checkManagerAccess(actorUserId, actorRole);
  return buildManagerOverview(range);
}

export async function getManagerAgentsResult(
  range: ManagerDateRange,
  actorUserId: string,
  actorRole: AppRole
) {
  await checkManagerAccess(actorUserId, actorRole);
  return buildManagerAgents(range);
}

export async function getManagerHandoffsResult(
  range: ManagerDateRange,
  actorUserId: string,
  actorRole: AppRole
) {
  await checkManagerAccess(actorUserId, actorRole);
  return buildManagerHandoffs(range);
}

export function getManagerConfigSnapshot(): ManagerConfig {
  return structuredClone(managerConfigState.config);
}

export async function getManagerConfigResult(actorUserId: string, actorRole: AppRole): Promise<ManagerConfigResult> {
  await checkManagerAccess(actorUserId, actorRole);
  return {
    config: getManagerConfigSnapshot(),
    updatedAt: managerConfigState.updatedAt,
    updatedBy: managerConfigState.updatedBy
  };
}

export async function updateManagerConfigResult(
  body: ManagerConfigUpdateBody,
  actorUserId: string,
  actorRole: AppRole
): Promise<ManagerConfigResult> {
  await checkManagerAccess(actorUserId, actorRole);

  const nextConfig = structuredClone(managerConfigState.config);
  if (body.timezone !== undefined) {
    const timezone = body.timezone.trim();
    if (!timezone) {
      throw new ServiceError(400, "timezone must be a non-empty IANA timezone.");
    }
    try {
      Intl.DateTimeFormat("en-US", { timeZone: timezone }).format(new Date());
    } catch {
      throw new ServiceError(400, "timezone must be a valid IANA timezone.");
    }
    nextConfig.timezone = timezone;
  }

  if (body.workingHours) {
    if (body.workingHours.enabled !== undefined) {
      nextConfig.workingHours.enabled = Boolean(body.workingHours.enabled);
    }
    const startHour24 = validateHour(body.workingHours.startHour24, "workingHours.startHour24");
    const endHour24 = validateHour(body.workingHours.endHour24, "workingHours.endHour24");
    if (startHour24 !== undefined) {
      nextConfig.workingHours.startHour24 = startHour24;
    }
    if (endHour24 !== undefined) {
      nextConfig.workingHours.endHour24 = endHour24;
    }
    const weekdays = validateWeekdays(body.workingHours.weekdays);
    if (weekdays) {
      nextConfig.workingHours.weekdays = weekdays;
    }
  }

  if (body.thresholds) {
    const slowFirstReplyMinutes = validateThreshold(
      body.thresholds.slowFirstReplyMinutes,
      "thresholds.slowFirstReplyMinutes",
      1,
      120
    );
    const stalledConversationMinutes = validateThreshold(
      body.thresholds.stalledConversationMinutes,
      "thresholds.stalledConversationMinutes",
      2,
      240
    );
    if (slowFirstReplyMinutes !== undefined) {
      nextConfig.thresholds.slowFirstReplyMinutes = slowFirstReplyMinutes;
    }
    if (stalledConversationMinutes !== undefined) {
      nextConfig.thresholds.stalledConversationMinutes = stalledConversationMinutes;
    }
  }

  if (nextConfig.workingHours.startHour24 === nextConfig.workingHours.endHour24) {
    throw new ServiceError(400, "working hours start and end cannot be the same.");
  }

  managerConfigState.config = nextConfig;
  managerConfigState.updatedAt = new Date().toISOString();
  managerConfigState.updatedBy = actorUserId;

  return {
    config: getManagerConfigSnapshot(),
    updatedAt: managerConfigState.updatedAt,
    updatedBy: managerConfigState.updatedBy
  };
}

async function isSupportAgentUser(userId: string) {
  const supabase = getSupabaseServiceRoleClient();
  const { data, error } = await supabase.rpc("is_ava_support_agent", {
    p_user_id: userId
  });
  if (error) {
    throw new ServiceError(500, `Unable to validate support-agent access: ${error.message}`);
  }
  return Boolean(data);
}

export async function reassignManagerHandoffResult(
  body: ManagerReassignBody,
  actorUserId: string,
  actorRole: AppRole
): Promise<ManagerReassignResult> {
  await checkManagerAccess(actorUserId, actorRole);
  if (!body.requestId || !body.requestId.trim()) {
    throw new ServiceError(400, "requestId is required.");
  }
  if (!body.targetAgentId || !body.targetAgentId.trim()) {
    throw new ServiceError(400, "targetAgentId is required.");
  }

  const requestId = body.requestId.trim();
  const targetAgentId = body.targetAgentId.trim();
  if (!(await isSupportAgentUser(targetAgentId))) {
    throw new ServiceError(400, "targetAgentId must belong to a support agent.");
  }

  const supabase = getSupabaseServiceRoleClient();
  const { data: requestRow, error: requestError } = await supabase
    .schema("ava")
    .from("handoff_requests")
    .select(
      "id, conversation_id, status, reason, requested_at, claimed_at, claimed_by_auth_user_id, resolved_at"
    )
    .eq("id", requestId)
    .maybeSingle();

  if (requestError) {
    throw new ServiceError(500, `Unable to load handoff request: ${requestError.message}`);
  }
  const handoffRequest = requestRow as HandoffRequestRow | null;
  if (!handoffRequest) {
    throw new ServiceError(404, "Handoff request not found.");
  }
  if (handoffRequest.status === "resolved" || handoffRequest.status === "cancelled") {
    throw new ServiceError(409, "Cannot reassign a resolved handoff.");
  }
  if (handoffRequest.status === "pending") {
    throw new ServiceError(409, "Claim the handoff first before reassignment.");
  }
  if (handoffRequest.claimed_by_auth_user_id === targetAgentId) {
    throw new ServiceError(409, "Handoff is already assigned to that agent.");
  }

  const previousAgentId = handoffRequest.claimed_by_auth_user_id ?? null;
  const reassignedAt = new Date().toISOString();
  const { error: updateRequestError } = await supabase
    .schema("ava")
    .from("handoff_requests")
    .update({
      claimed_by_auth_user_id: targetAgentId,
      claimed_at: reassignedAt
    })
    .eq("id", requestId)
    .in("status", ["claimed", "active"]);

  if (updateRequestError) {
    throw new ServiceError(500, `Unable to reassign handoff request: ${updateRequestError.message}`);
  }

  const { error: updateConversationError } = await supabase
    .schema("ava")
    .from("conversations")
    .update({
      active_support_agent_auth_user_id: targetAgentId,
      handoff_state: "active",
      status: "active_handoff",
      updated_at: reassignedAt
    })
    .eq("id", handoffRequest.conversation_id);
  if (updateConversationError) {
    throw new ServiceError(500, `Unable to update handoff conversation assignment: ${updateConversationError.message}`);
  }

  const { error: transferCancelError } = await supabase
    .schema("ava")
    .from("agent_transfer_requests")
    .update({
      status: "cancelled",
      cancelled_at: reassignedAt,
      updated_at: reassignedAt
    })
    .eq("handoff_request_id", handoffRequest.id)
    .eq("status", "pending");

  if (transferCancelError) {
    if (!isAgentTransferRequestsUnavailableError(transferCancelError)) {
      throw new ServiceError(
        500,
        `Unable to clear pending transfer requests: ${transferCancelError.message}`
      );
    }
  }

  const targetProfileMap = await fetchProfilesByIds([targetAgentId]);
  const targetAgentName = getProfileDisplayName(targetProfileMap.get(targetAgentId));

  const reason = body.reason?.trim();
  const systemMessage = reason
    ? `Handoff reassigned to ${targetAgentName}. Reason: ${reason}`
    : `Handoff reassigned to ${targetAgentName}.`;
  const { error: messageError } = await supabase
    .schema("ava")
    .from("messages")
    .insert({
      conversation_id: handoffRequest.conversation_id,
      sender_kind: "system",
      sender_auth_user_id: actorUserId,
      body: systemMessage,
      payload: {
        systemEvent: "queue_update",
        kind: "manager_reassign",
        previousAgentId,
        targetAgentId
      }
    });
  if (messageError) {
    throw new ServiceError(500, `Unable to create reassignment system message: ${messageError.message}`);
  }

  const { error: eventError } = await supabase.schema("ava").from("handoff_events").insert({
    handoff_request_id: handoffRequest.id,
    conversation_id: handoffRequest.conversation_id,
    event_type: "claimed",
    actor_auth_user_id: actorUserId,
    payload: {
      reassigned: true,
      previousAgentId,
      targetAgentId,
      reason: reason || null
    }
  });
  if (eventError) {
    throw new ServiceError(500, `Unable to create reassignment event: ${eventError.message}`);
  }

  return {
    requestId: handoffRequest.id,
    conversationId: handoffRequest.conversation_id,
    previousAgentId,
    targetAgentId,
    targetAgentName,
    reassignedAt
  };
}
