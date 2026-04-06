import {
  type ConversationThread,
  type HandoffFeedbackRequest,
  type HandoffRating,
  type QueueSnapshot,
  type RepresentativeProfile,
  type SystemEvent,
  type TimelineMessage
} from "@ava/chat-domain";
import {
  getMySqlCustomerProjectDetails,
  listMySqlProjectCustomers
} from "@/lib/mysql/customer-projects";
import { getSupabaseServiceRoleClient } from "@/lib/supabase/server";

type AppendableMessageInput =
  | { kind: "customer"; text: string; clientMessageId?: string }
  | { kind: "ava"; text: string }
  | { kind: "representative"; text: string; representativeId: string; clientMessageId?: string };

export interface QueueRecord {
  requestId: string;
  conversationId: string;
  customerName: string;
  impersonationByName?: string | null;
  reason?: string;
  status: "pending" | "claimed" | "active" | "resolved";
  position: number;
  estimatedWaitSeconds: number;
  elapsedWaitSeconds: number;
  representative?: RepresentativeProfile;
  requestedAt: string;
  claimedAt: string | null;
  claimedByAuthUserId: string | null;
  resolvedAt: string | null;
  resolvedByAuthUserId: string | null;
  customerRating: HandoffRating | null;
}

export interface RealtimeEvent {
  id: string;
  type: "message_created" | "handoff_requested" | "handoff_claimed" | "handoff_resolved" | "typing";
  conversationId: string;
  createdAt: string;
  payload: unknown;
}

export interface RealtimeEventsPage {
  events: RealtimeEvent[];
  latestEventId?: string;
  cursorFound: boolean;
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

export interface AvaConversationContext {
  conversationId: string;
  handoffState: "none" | "pending" | "claimed" | "active" | "resolved";
  customer: {
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

export interface ImpersonationCustomerCandidate {
  projectRef: string;
  customerId: string | null;
  customerName: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  projectStatus: string | null;
  projectTitle: string | null;
}

interface ConversationRow {
  id: string;
  customer_auth_user_id: string;
  handoff_state: "none" | "pending" | "claimed" | "active" | "resolved";
  active_support_agent_auth_user_id: string | null;
  channel?: string | null;
  updated_at: string;
}

interface ConversationDetailsRow extends ConversationRow {
  customer_profile_id: string | null;
  project_ref: string | null;
}

interface MessageRow {
  id: string;
  conversation_id: string;
  sender_kind: "customer" | "ava" | "support_agent" | "system";
  sender_auth_user_id: string | null;
  client_message_id?: string | null;
  body: string;
  payload: Record<string, unknown> | null;
  created_at: string;
}

interface HandoffRequestRow {
  id: string;
  conversation_id: string;
  status: "pending" | "claimed" | "active" | "resolved" | "cancelled";
  reason: string | null;
  requested_at: string;
  claimed_at: string | null;
  claimed_by_auth_user_id: string | null;
  resolved_at: string | null;
}

interface HandoffEventRow {
  id: string;
  handoff_request_id: string;
  conversation_id: string;
  event_type: "requested" | "claimed" | "activated" | "resolved" | "cancelled" | "queue_update";
  actor_auth_user_id: string | null;
  payload: Record<string, unknown> | null;
  created_at: string;
}

interface SupportAgentNoteRow {
  id: string;
  conversation_id: string;
  author_auth_user_id: string;
  body: string;
  created_at: string;
}

interface ProfileRow {
  id: string;
  full_name: string | null;
  preferred_name: string | null;
}

interface ProfileCustomerFallbackRow {
  id: string;
  full_name: string | null;
  email: string | null;
}

interface CustomerProfileRow {
  auth_user_id: string;
  full_name: string | null;
  email: string;
}

interface QueueConversationRow {
  id: string;
  customer_auth_user_id: string;
  channel: string | null;
  subject: string | null;
}

interface CustomerProfileIdRow {
  id: string;
}

interface CustomerProfileDetailsRow {
  id: string;
  auth_user_id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  project_customer_id: string | null;
  metadata: Record<string, unknown> | null;
}

interface ResolvedCustomerProjectDetails {
  customerId: string | null;
  customerFullName: string | null;
  customerEmail: string | null;
  customerPhone: string | null;
  customerAddress: string | null;
  customerFin: string | null;
  projectRef: string | null;
  projectStatus: string | null;
  siteAddress: string | null;
  metadata: Record<string, unknown>;
}

const typingEvents: RealtimeEvent[] = [];

const systemEventValues: SystemEvent[] = [
  "request_sent",
  "queue_update",
  "connected",
  "disconnected",
  "rate_limited",
  "delivery_failed"
];

function nowIso() {
  return new Date().toISOString();
}

function elapsedSeconds(fromIso: string) {
  const diff = Date.now() - new Date(fromIso).getTime();
  return Math.max(0, Math.floor(diff / 1000));
}

function estimatedWaitSeconds(status: HandoffRequestRow["status"]) {
  if (status === "pending") {
    return 180;
  }
  if (status === "claimed") {
    return 60;
  }
  return 0;
}

function toSystemEvent(value: unknown): SystemEvent {
  if (typeof value === "string" && systemEventValues.includes(value as SystemEvent)) {
    return value as SystemEvent;
  }
  return "queue_update";
}

function isNoRowsError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "PGRST116"
  );
}

function isUniqueViolationError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "23505"
  );
}

function isMissingClientMessageIdColumnError(error: unknown) {
  if (!error || typeof error !== "object") {
    return false;
  }

  const code = "code" in error ? (error as { code?: string }).code : undefined;
  if (code === "42703") {
    return true;
  }

  const message = "message" in error ? (error as { message?: string }).message : undefined;
  return typeof message === "string" && message.includes("client_message_id") && message.includes("does not exist");
}

let supportsClientMessageIdColumn: boolean | undefined;

async function hasClientMessageIdColumn() {
  if (supportsClientMessageIdColumn !== undefined) {
    return supportsClientMessageIdColumn;
  }

  const supabase = getSupabaseServiceRoleClient();
  const { error } = await supabase
    .schema("ava")
    .from("messages")
    .select("id, client_message_id")
    .limit(1);

  if (!error) {
    supportsClientMessageIdColumn = true;
    return true;
  }

  if (isMissingClientMessageIdColumnError(error)) {
    supportsClientMessageIdColumn = false;
    return false;
  }

  throw new StoreError(
    500,
    `Unable to verify messages schema for idempotent sends: ${error.message}`
  );
}

function randomId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return undefined;
}

function asTrimmedString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const normalized = value.trim();
  return normalized ? normalized : undefined;
}

function firstStringValue(values: unknown[]): string | null {
  for (const value of values) {
    const match = asTrimmedString(value);
    if (match) {
      return match;
    }
  }
  return null;
}

function isHandoffRating(value: unknown): value is HandoffRating {
  return value === "thumbs_up" || value === "thumbs_down";
}

function parseHandoffFeedbackRequest(value: unknown): HandoffFeedbackRequest | undefined {
  const payload = asRecord(value);
  if (!payload) {
    return undefined;
  }

  if (payload.type !== "handoff_rating") {
    return undefined;
  }

  const requestId = asTrimmedString(payload.requestId);
  const representativeName = asTrimmedString(payload.representativeName) ?? "your representative";
  if (!requestId) {
    return undefined;
  }

  const submittedRating = isHandoffRating(payload.submittedRating)
    ? payload.submittedRating
    : null;
  return {
    type: "handoff_rating",
    requestId,
    representativeName,
    submittedRating
  };
}

function parseCustomerRatingPayload(value: unknown): HandoffRating | null {
  const payload = asRecord(value);
  if (!payload) {
    return null;
  }

  if (payload.kind !== "customer_rating") {
    return null;
  }

  return isHandoffRating(payload.rating) ? payload.rating : null;
}

export class StoreError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function isAvaSupportAgent(userId: string) {
  const supabase = getSupabaseServiceRoleClient();
  const { data, error } = await supabase.rpc("is_ava_support_agent", {
    p_user_id: userId
  });
  if (error) {
    throw new StoreError(500, `Unable to resolve support-agent access: ${error.message}`);
  }
  return Boolean(data);
}

async function isAdminLike(userId: string) {
  const supabase = getSupabaseServiceRoleClient();
  const { data, error } = await supabase.rpc("is_admin_like", {
    p_user_id: userId
  });
  if (error) {
    throw new StoreError(500, `Unable to resolve admin override access: ${error.message}`);
  }
  return Boolean(data);
}

async function getConversationRow(conversationId: string) {
  const supabase = getSupabaseServiceRoleClient();
  const { data, error } = await supabase
    .schema("ava")
    .from("conversations")
    .select("id, customer_auth_user_id, handoff_state, active_support_agent_auth_user_id, updated_at")
    .eq("id", conversationId)
    .single();

  if (error && !isNoRowsError(error)) {
    throw new StoreError(500, `Unable to load conversation: ${error.message}`);
  }
  return (data ?? undefined) as ConversationRow | undefined;
}

function requireConversationAccess(
  conversation: ConversationRow | undefined,
  actorUserId: string,
  isSupportAgent: boolean
): ConversationRow {
  if (!conversation) {
    throw new StoreError(404, "Conversation not found.");
  }
  if (!isSupportAgent && conversation.customer_auth_user_id !== actorUserId) {
    throw new StoreError(403, "You do not have access to this conversation.");
  }
  return conversation;
}

async function getSupportAgentMap(ids: string[]) {
  const uniqueIds = Array.from(new Set(ids.filter(Boolean)));
  if (uniqueIds.length === 0) {
    return new Map<string, RepresentativeProfile>();
  }

  const supabase = getSupabaseServiceRoleClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, preferred_name")
    .in("id", uniqueIds);

  if (error) {
    throw new StoreError(500, `Unable to load support agent profiles: ${error.message}`);
  }

  const result = new Map<string, RepresentativeProfile>();
  for (const row of (data ?? []) as ProfileRow[]) {
    const name = row.preferred_name?.trim() || row.full_name?.trim() || "Representative";
    result.set(row.id, { id: row.id, name });
  }
  return result;
}

async function getCustomerNameMapByAuthUserId(authUserIds: string[]) {
  const uniqueIds = Array.from(new Set(authUserIds.filter(Boolean)));
  if (uniqueIds.length === 0) {
    return new Map<string, string>();
  }

  const supabase = getSupabaseServiceRoleClient();
  const { data, error } = await supabase
    .schema("ava")
    .from("customer_profiles")
    .select("auth_user_id, full_name, email")
    .in("auth_user_id", uniqueIds);

  if (error) {
    throw new StoreError(500, `Unable to load customer profiles: ${error.message}`);
  }

  const result = new Map<string, string>();
  for (const row of (data ?? []) as CustomerProfileRow[]) {
    const label = row.full_name?.trim() || row.email?.trim() || "Customer";
    result.set(row.auth_user_id, label);
  }

  const unresolvedAuthUserIds = uniqueIds.filter((id) => !result.has(id));
  if (unresolvedAuthUserIds.length === 0) {
    return result;
  }

  const { data: profileRows, error: profileError } = await supabase
    .from("profiles")
    .select("id, full_name, email")
    .in("id", unresolvedAuthUserIds);

  if (profileError) {
    throw new StoreError(500, `Unable to load customer fallback profiles: ${profileError.message}`);
  }

  for (const row of (profileRows ?? []) as ProfileCustomerFallbackRow[]) {
    const label = row.full_name?.trim() || row.email?.trim() || "Customer";
    result.set(row.id, label);
  }
  return result;
}

function parseImpersonatedCustomerLabel(subject: string | null | undefined) {
  const value = subject?.trim();
  if (!value) {
    return null;
  }

  const normalized = value.replace(/^Impersonation test:\s*/i, "").trim();
  return normalized || value;
}

async function getQueueCustomerPresentationByConversationId(conversationId: string): Promise<{
  customerLabel: string;
  impersonationByName: string | null;
}> {
  try {
    const supabase = getSupabaseServiceRoleClient();
    const { data: conversationRow, error: conversationError } = await supabase
      .schema("ava")
      .from("conversations")
      .select("customer_auth_user_id, channel, subject")
      .eq("id", conversationId)
      .maybeSingle();

    if (conversationError) {
      return {
        customerLabel: "Customer",
        impersonationByName: null
      };
    }

    const row = conversationRow as
      | {
          customer_auth_user_id?: string | null;
          channel?: string | null;
          subject?: string | null;
        }
      | null;
    const customerAuthUserId = row?.customer_auth_user_id;
    if (!customerAuthUserId) {
      return {
        customerLabel: "Customer",
        impersonationByName: null
      };
    }

    const isImpersonation = row?.channel === "agent_impersonation";
    const impersonatedCustomerLabel = isImpersonation
      ? parseImpersonatedCustomerLabel(row?.subject)
      : null;

    const customerNameMap = await getCustomerNameMapByAuthUserId([customerAuthUserId]);
    const mappedLabel = customerNameMap.get(customerAuthUserId);
    const fallbackLabel = mappedLabel ?? (customerAuthUserId.includes("@") ? customerAuthUserId : null);
    const profileMap = await getSupportAgentMap([customerAuthUserId]);
    const impersonationByName = isImpersonation
      ? (profileMap.get(customerAuthUserId)?.name ?? "Employee")
      : null;

    return {
      customerLabel: impersonatedCustomerLabel ?? fallbackLabel ?? "Customer",
      impersonationByName
    };
  } catch {
    return {
      customerLabel: "Customer",
      impersonationByName: null
    };
  }
}

async function listAccessibleConversationRows(
  actorUserId: string,
  isSupportAgent: boolean,
  options?: {
    excludeImpersonation?: boolean;
    ownOnly?: boolean;
  }
) {
  const supabase = getSupabaseServiceRoleClient();
  let query = supabase
    .schema("ava")
    .from("conversations")
    .select(
      "id, customer_auth_user_id, handoff_state, active_support_agent_auth_user_id, channel, updated_at"
    )
    .order("updated_at", { ascending: false })
    .limit(200);

  if (!isSupportAgent || options?.ownOnly) {
    query = query.eq("customer_auth_user_id", actorUserId);
  }

  const { data, error } = await query;
  if (error) {
    throw new StoreError(500, `Unable to list conversations: ${error.message}`);
  }
  const rows = (data ?? []) as ConversationRow[];
  if (!options?.excludeImpersonation) {
    return rows;
  }

  return rows.filter((row) => row.channel !== "agent_impersonation");
}

async function getMessagesByConversationIds(conversationIds: string[]) {
  if (conversationIds.length === 0) {
    return new Map<string, MessageRow[]>();
  }

  const supabase = getSupabaseServiceRoleClient();
  const { data, error } = await supabase
    .schema("ava")
    .from("messages")
    .select("id, conversation_id, sender_kind, sender_auth_user_id, body, payload, created_at")
    .in("conversation_id", conversationIds)
    .order("created_at", { ascending: true });

  if (error) {
    throw new StoreError(500, `Unable to load messages: ${error.message}`);
  }

  const grouped = new Map<string, MessageRow[]>();
  for (const row of (data ?? []) as MessageRow[]) {
    const list = grouped.get(row.conversation_id) ?? [];
    list.push(row);
    grouped.set(row.conversation_id, list);
  }
  return grouped;
}

async function getLatestHandoffByConversationIds(conversationIds: string[]) {
  if (conversationIds.length === 0) {
    return new Map<string, HandoffRequestRow>();
  }

  const supabase = getSupabaseServiceRoleClient();
  const { data, error } = await supabase
    .schema("ava")
    .from("handoff_requests")
    .select(
      "id, conversation_id, status, reason, requested_at, claimed_at, claimed_by_auth_user_id, resolved_at"
    )
    .in("conversation_id", conversationIds)
    .order("requested_at", { ascending: false });

  if (error) {
    throw new StoreError(500, `Unable to load handoff requests: ${error.message}`);
  }

  const latestByConversation = new Map<string, HandoffRequestRow>();
  for (const row of (data ?? []) as HandoffRequestRow[]) {
    if (!latestByConversation.has(row.conversation_id)) {
      latestByConversation.set(row.conversation_id, row);
    }
  }
  return latestByConversation;
}

async function getPendingQueuePositions() {
  const supabase = getSupabaseServiceRoleClient();
  const { data, error } = await supabase
    .schema("ava")
    .from("handoff_requests")
    .select("id")
    .eq("status", "pending")
    .order("requested_at", { ascending: true });

  if (error) {
    throw new StoreError(500, `Unable to compute queue positions: ${error.message}`);
  }

  const positions = new Map<string, number>();
  ((data ?? []) as Array<{ id: string }>).forEach((row, index) => {
    positions.set(row.id, index + 1);
  });
  return positions;
}

async function getLatestOpenHandoffRequest(
  conversationId: string
): Promise<HandoffRequestRow | undefined> {
  const supabase = getSupabaseServiceRoleClient();
  const { data, error } = await supabase
    .schema("ava")
    .from("handoff_requests")
    .select(
      "id, conversation_id, status, reason, requested_at, claimed_at, claimed_by_auth_user_id, resolved_at"
    )
    .eq("conversation_id", conversationId)
    .in("status", ["pending", "claimed", "active"])
    .order("requested_at", { ascending: false })
    .limit(1);

  if (error) {
    throw new StoreError(500, `Unable to load latest open handoff request: ${error.message}`);
  }

  return ((data ?? [])[0] ?? undefined) as HandoffRequestRow | undefined;
}

async function getResolvedActorByRequestIds(requestIds: string[]): Promise<Map<string, string>> {
  if (requestIds.length === 0) {
    return new Map();
  }

  const supabase = getSupabaseServiceRoleClient();
  const { data, error } = await supabase
    .schema("ava")
    .from("handoff_events")
    .select("handoff_request_id, actor_auth_user_id, created_at")
    .in("handoff_request_id", requestIds)
    .eq("event_type", "resolved")
    .order("created_at", { ascending: false });

  if (error) {
    throw new StoreError(500, `Unable to load resolved handoff actors: ${error.message}`);
  }

  const resolvedByRequestId = new Map<string, string>();
  for (const row of (data ?? []) as Array<{
    handoff_request_id: string;
    actor_auth_user_id: string | null;
    created_at: string;
  }>) {
    if (!row.actor_auth_user_id) {
      continue;
    }
    if (!resolvedByRequestId.has(row.handoff_request_id)) {
      resolvedByRequestId.set(row.handoff_request_id, row.actor_auth_user_id);
    }
  }

  return resolvedByRequestId;
}

async function getLatestCustomerRatingByRequestIds(
  requestIds: string[]
): Promise<Map<string, HandoffRating>> {
  if (requestIds.length === 0) {
    return new Map();
  }

  const supabase = getSupabaseServiceRoleClient();
  const { data, error } = await supabase
    .schema("ava")
    .from("handoff_events")
    .select("handoff_request_id, payload, created_at")
    .in("handoff_request_id", requestIds)
    .eq("event_type", "queue_update")
    .order("created_at", { ascending: false });

  if (error) {
    throw new StoreError(500, `Unable to load customer ratings: ${error.message}`);
  }

  const ratingByRequestId = new Map<string, HandoffRating>();
  for (const row of (data ?? []) as Array<{
    handoff_request_id: string;
    payload: Record<string, unknown> | null;
    created_at: string;
  }>) {
    if (ratingByRequestId.has(row.handoff_request_id)) {
      continue;
    }

    const rating = parseCustomerRatingPayload(row.payload);
    if (!rating) {
      continue;
    }

    ratingByRequestId.set(row.handoff_request_id, rating);
  }

  return ratingByRequestId;
}

function toQueueRecordFromRequest(params: {
  request: HandoffRequestRow;
  conversationId: string;
  customerName: string;
  impersonationByName?: string | null;
  representative?: RepresentativeProfile;
  pendingPosition?: number;
  resolvedByAuthUserId?: string | null;
  customerRating?: HandoffRating | null;
}): QueueRecord {
  const {
    request,
    conversationId,
    customerName,
    impersonationByName,
    representative,
    pendingPosition,
    resolvedByAuthUserId,
    customerRating
  } = params;
  return {
    requestId: request.id,
    conversationId,
    customerName,
    impersonationByName: impersonationByName ?? null,
    reason: request.reason ?? undefined,
    status:
      request.status === "cancelled"
        ? "resolved"
        : (request.status as "pending" | "claimed" | "active" | "resolved"),
    position: pendingPosition ?? 0,
    estimatedWaitSeconds: estimatedWaitSeconds(request.status),
    elapsedWaitSeconds: elapsedSeconds(request.requested_at),
    representative,
    requestedAt: request.requested_at,
    claimedAt: request.claimed_at,
    claimedByAuthUserId: request.claimed_by_auth_user_id,
    resolvedAt: request.resolved_at,
    resolvedByAuthUserId: resolvedByAuthUserId ?? null,
    customerRating: customerRating ?? null
  };
}

function rowToTimelineMessage(
  row: MessageRow,
  supportAgentMap: Map<string, RepresentativeProfile>
): TimelineMessage {
  if (row.sender_kind === "support_agent") {
    return {
      id: row.id,
      conversationId: row.conversation_id,
      createdAt: row.created_at,
      deliveryState: "sent",
      kind: "representative",
      representativeId: row.sender_auth_user_id ?? "rep-unknown",
      text: row.body
    };
  }

  if (row.sender_kind === "system") {
    const payload = row.payload ?? {};
    const queue = payload.queue;
    const payloadRecord = asRecord(payload);
    const feedbackRequest = parseHandoffFeedbackRequest(payloadRecord?.feedbackRequest);
    const representative = row.sender_auth_user_id
      ? supportAgentMap.get(row.sender_auth_user_id)
      : undefined;

    return {
      id: row.id,
      conversationId: row.conversation_id,
      createdAt: row.created_at,
      deliveryState: "sent",
      kind: "system",
      text: row.body,
      systemEvent: toSystemEvent(payload.systemEvent),
      representative,
      queue: (typeof queue === "object" && queue ? (queue as QueueSnapshot) : undefined) ?? undefined,
      feedbackRequest
    };
  }

  if (row.sender_kind === "ava") {
    const payload = row.payload ?? {};
    const payloadRecord = asRecord(payload);
    const feedbackRequest = parseHandoffFeedbackRequest(payloadRecord?.feedbackRequest);
    return {
      id: row.id,
      conversationId: row.conversation_id,
      createdAt: row.created_at,
      deliveryState: "sent",
      kind: "ava",
      text: row.body,
      feedbackRequest
    };
  }

  return {
    id: row.id,
    conversationId: row.conversation_id,
    createdAt: row.created_at,
    deliveryState: "sent",
    kind: row.sender_kind,
    text: row.body
  } as TimelineMessage;
}

function requestToQueueSnapshot(
  request: HandoffRequestRow | undefined,
  queuePosition: number | undefined
): QueueSnapshot | undefined {
  if (!request) {
    return undefined;
  }

  return {
    requestId: request.id,
    position: queuePosition ?? 0,
    estimatedWaitSeconds: estimatedWaitSeconds(request.status),
    elapsedWaitSeconds: elapsedSeconds(request.requested_at),
    reason: request.reason ?? undefined
  };
}

function conversationToThread(params: {
  conversation: ConversationRow;
  messages: MessageRow[];
  latestRequest: HandoffRequestRow | undefined;
  queuePosition: number | undefined;
  supportAgentMap: Map<string, RepresentativeProfile>;
}): ConversationThread {
  const { conversation, messages, latestRequest, queuePosition, supportAgentMap } = params;

  return {
    id: conversation.id,
    authenticated: true,
    messages: messages.map((message) => rowToTimelineMessage(message, supportAgentMap)),
    handoff: {
      state: conversation.handoff_state,
      requestId: latestRequest?.id,
      requestedAt: latestRequest?.requested_at,
      queue: requestToQueueSnapshot(latestRequest, queuePosition)
    },
    activeRepresentative: conversation.active_support_agent_auth_user_id
      ? supportAgentMap.get(conversation.active_support_agent_auth_user_id)
      : undefined,
    updatedAt: conversation.updated_at
  };
}

async function buildThreadList(conversationRows: ConversationRow[]) {
  if (conversationRows.length === 0) {
    return [];
  }

  const conversationIds = conversationRows.map((item) => item.id);
  const [messagesByConversation, latestRequestByConversation, pendingPositions] = await Promise.all([
    getMessagesByConversationIds(conversationIds),
    getLatestHandoffByConversationIds(conversationIds),
    getPendingQueuePositions()
  ]);

  const supportAgentIds = new Set<string>();
  for (const conversation of conversationRows) {
    if (conversation.active_support_agent_auth_user_id) {
      supportAgentIds.add(conversation.active_support_agent_auth_user_id);
    }
  }

  for (const messages of messagesByConversation.values()) {
    for (const message of messages) {
      if (message.sender_auth_user_id) {
        supportAgentIds.add(message.sender_auth_user_id);
      }
    }
  }

  for (const request of latestRequestByConversation.values()) {
    if (request.claimed_by_auth_user_id) {
      supportAgentIds.add(request.claimed_by_auth_user_id);
    }
  }

  const supportAgentMap = await getSupportAgentMap(Array.from(supportAgentIds));

  return conversationRows.map((conversation) => {
    const latestRequest = latestRequestByConversation.get(conversation.id);
    const queuePosition = latestRequest ? pendingPositions.get(latestRequest.id) : undefined;
    return conversationToThread({
      conversation,
      messages: messagesByConversation.get(conversation.id) ?? [],
      latestRequest,
      queuePosition,
      supportAgentMap
    });
  });
}

export async function createConversation(
  actorUserId: string,
  input?: {
    subject?: string;
    projectRef?: string;
    greetingText?: string;
  }
): Promise<ConversationThread> {
  const supabase = getSupabaseServiceRoleClient();
  const { data: existingRows, error: existingError } = await supabase
    .schema("ava")
    .from("conversations")
    .select(
      "id, customer_auth_user_id, handoff_state, active_support_agent_auth_user_id, channel, updated_at"
    )
    .eq("customer_auth_user_id", actorUserId)
    .in("status", ["open", "pending_handoff", "active_handoff"])
    .order("updated_at", { ascending: false })
    .limit(20);

  if (existingError) {
    throw new StoreError(500, `Unable to check existing conversations: ${existingError.message}`);
  }

  const existing = ((existingRows ?? []) as ConversationRow[]).find(
    (row) => row.channel !== "agent_impersonation"
  );
  if (existing) {
    const existingThread = (await buildThreadList([existing]))[0];
    if (existingThread) {
      return existingThread;
    }
  }

  const { data: customerProfileRows, error: customerProfileError } = await supabase
    .schema("ava")
    .from("customer_profiles")
    .select("id")
    .eq("auth_user_id", actorUserId)
    .limit(1);

  if (customerProfileError) {
    throw new StoreError(
      500,
      `Unable to resolve customer profile for conversation creation: ${customerProfileError.message}`
    );
  }

  const customerProfile = ((customerProfileRows ?? [])[0] ?? undefined) as
    | CustomerProfileIdRow
    | undefined;
  const { data: insertedConversation, error: conversationInsertError } = await supabase
    .schema("ava")
    .from("conversations")
    .insert({
      customer_auth_user_id: actorUserId,
      customer_profile_id: customerProfile?.id ?? null,
      subject: input?.subject?.trim() || null,
      project_ref: input?.projectRef?.trim() || null,
      channel: "widget",
      status: "open",
      handoff_state: "none"
    })
    .select("id, customer_auth_user_id, handoff_state, active_support_agent_auth_user_id, updated_at")
    .single();

  if (conversationInsertError) {
    throw new StoreError(500, `Unable to create conversation: ${conversationInsertError.message}`);
  }

  const greetingText = input?.greetingText?.trim() || "Hi! How can I help you today?";
  const now = nowIso();
  const { error: greetingError } = await supabase
    .schema("ava")
    .from("messages")
    .insert({
      conversation_id: insertedConversation.id,
      sender_kind: "ava",
      sender_auth_user_id: null,
      body: greetingText,
      payload: {}
    });

  if (greetingError) {
    throw new StoreError(500, `Unable to create conversation greeting: ${greetingError.message}`);
  }

  const { error: conversationTimestampError } = await supabase
    .schema("ava")
    .from("conversations")
    .update({
      updated_at: now,
      last_message_at: now
    })
    .eq("id", insertedConversation.id);

  if (conversationTimestampError) {
    throw new StoreError(
      500,
      `Unable to update conversation timestamps: ${conversationTimestampError.message}`
    );
  }

  const thread = (await buildThreadList([insertedConversation as ConversationRow]))[0];
  if (!thread) {
    throw new StoreError(500, "Unable to load newly created conversation.");
  }

  return thread;
}

export async function listImpersonationCustomers(
  actorUserId: string,
  input?: {
    query?: string;
    limit?: number;
  }
): Promise<ImpersonationCustomerCandidate[]> {
  const supportAgent = await isAvaSupportAgent(actorUserId);
  if (!supportAgent) {
    throw new StoreError(403, "Support-agent role required.");
  }

  const rows = await listMySqlProjectCustomers({
    query: input?.query,
    limit: input?.limit
  });

  return rows
    .map((row) => {
      const projectRef = asTrimmedString(row.projectId);
      if (!projectRef) {
        return undefined;
      }

      return {
        projectRef,
        customerId: asTrimmedString(row.customerId) ?? null,
        customerName: asTrimmedString(row.customerName) ?? null,
        email: asTrimmedString(row.email) ?? null,
        phone: asTrimmedString(row.phone) ?? null,
        address: asTrimmedString(row.fullAddress) ?? null,
        projectStatus: asTrimmedString(row.projectStatus) ?? null,
        projectTitle: asTrimmedString(row.projectTitle) ?? null
      } satisfies ImpersonationCustomerCandidate;
    })
    .filter((row): row is ImpersonationCustomerCandidate => Boolean(row));
}

export async function createImpersonationConversation(
  actorUserId: string,
  input: {
    projectRef?: string;
    customerName?: string;
    customerEmail?: string;
    greetingText?: string;
  }
): Promise<ConversationThread> {
  const supportAgent = await isAvaSupportAgent(actorUserId);
  if (!supportAgent) {
    throw new StoreError(403, "Support-agent role required.");
  }

  const projectRef = input.projectRef?.trim();
  if (!projectRef) {
    throw new StoreError(400, "projectRef is required.");
  }

  const customerName = input.customerName?.trim();
  const customerEmail = input.customerEmail?.trim();
  const customerLabel = customerName || customerEmail || `Project ${projectRef}`;
  const greetingText =
    input.greetingText?.trim() ||
    (customerName
      ? `Hi ${customerName}! I'm Ava. How can I help you today?`
      : "Hi! I'm Ava. How can I help you today?");

  const supabase = getSupabaseServiceRoleClient();
  const { data: insertedConversation, error: conversationInsertError } = await supabase
    .schema("ava")
    .from("conversations")
    .insert({
      customer_auth_user_id: actorUserId,
      customer_profile_id: null,
      subject: `Impersonation test: ${customerLabel}`,
      project_ref: projectRef,
      channel: "agent_impersonation",
      status: "open",
      handoff_state: "none"
    })
    .select("id, customer_auth_user_id, handoff_state, active_support_agent_auth_user_id, updated_at")
    .single();

  if (conversationInsertError) {
    throw new StoreError(
      500,
      `Unable to create impersonation conversation: ${conversationInsertError.message}`
    );
  }

  const now = nowIso();
  const { error: greetingError } = await supabase
    .schema("ava")
    .from("messages")
    .insert({
      conversation_id: insertedConversation.id,
      sender_kind: "ava",
      sender_auth_user_id: null,
      body: greetingText,
      payload: {}
    });

  if (greetingError) {
    throw new StoreError(
      500,
      `Unable to create impersonation conversation greeting: ${greetingError.message}`
    );
  }

  const { error: conversationTimestampError } = await supabase
    .schema("ava")
    .from("conversations")
    .update({
      updated_at: now,
      last_message_at: now
    })
    .eq("id", insertedConversation.id);

  if (conversationTimestampError) {
    throw new StoreError(
      500,
      `Unable to update impersonation conversation timestamps: ${conversationTimestampError.message}`
    );
  }

  const thread = (await buildThreadList([insertedConversation as ConversationRow]))[0];
  if (!thread) {
    throw new StoreError(500, "Unable to load newly created impersonation conversation.");
  }

  return thread;
}

export async function listConversations(
  actorUserId: string,
  options?: {
    excludeImpersonation?: boolean;
    ownOnly?: boolean;
  }
): Promise<ConversationThread[]> {
  const supportAgent = await isAvaSupportAgent(actorUserId);
  const conversationRows = await listAccessibleConversationRows(actorUserId, supportAgent, options);
  return buildThreadList(conversationRows);
}

export async function getConversation(
  conversationId: string,
  actorUserId: string
): Promise<ConversationThread | undefined> {
  const supportAgent = await isAvaSupportAgent(actorUserId);
  const conversation = await getConversationRow(conversationId);

  if (!conversation) {
    return undefined;
  }
  if (!supportAgent && conversation.customer_auth_user_id !== actorUserId) {
    return undefined;
  }

  const threads = await buildThreadList([conversation]);
  return threads[0];
}

export async function listQueue(
  actorUserId: string,
  options?: {
    resolvedScope?: "all" | "agent";
  }
): Promise<QueueRecord[]> {
  const supportAgent = await isAvaSupportAgent(actorUserId);
  if (!supportAgent) {
    throw new StoreError(403, "Support-agent role required.");
  }

  const supabase = getSupabaseServiceRoleClient();
  const { data, error } = await supabase
    .schema("ava")
    .from("handoff_requests")
    .select(
      "id, conversation_id, status, reason, requested_at, claimed_at, claimed_by_auth_user_id, resolved_at"
    )
    .neq("status", "cancelled")
    .order("requested_at", { ascending: true });

  if (error) {
    throw new StoreError(500, `Unable to list queue: ${error.message}`);
  }

  const queueRows = (data ?? []) as HandoffRequestRow[];
  if (queueRows.length === 0) {
    return [];
  }

  const conversationIds = queueRows.map((item) => item.conversation_id);
  const pendingPositions = await getPendingQueuePositions();

  const { data: conversationRows, error: conversationError } = await supabase
    .schema("ava")
    .from("conversations")
    .select("id, customer_auth_user_id, channel, subject")
    .in("id", conversationIds);

  if (conversationError) {
    throw new StoreError(500, `Unable to resolve queued conversations: ${conversationError.message}`);
  }

  const queueConversationRows = (conversationRows ?? []) as QueueConversationRow[];
  const conversationById = new Map<string, QueueConversationRow>();
  for (const row of queueConversationRows) {
    conversationById.set(row.id, row);
  }

  const customerAuthIds = Array.from(
    new Set(
      queueRows
        .map((row) => conversationById.get(row.conversation_id)?.customer_auth_user_id)
        .filter((value): value is string => Boolean(value))
    )
  );
  const customerNameMap = await getCustomerNameMapByAuthUserId(customerAuthIds);

  const representativeIds = queueRows
    .map((item) => item.claimed_by_auth_user_id)
    .filter((value): value is string => Boolean(value));
  const impersonatorIds = queueConversationRows
    .filter((row) => row.channel === "agent_impersonation")
    .map((row) => row.customer_auth_user_id)
    .filter((value): value is string => Boolean(value));
  const profileMap = await getSupportAgentMap([...representativeIds, ...impersonatorIds]);
  const resolvedByRequestId = await getResolvedActorByRequestIds(
    queueRows.map((row) => row.id)
  );
  const customerRatingByRequestId = await getLatestCustomerRatingByRequestIds(
    queueRows.map((row) => row.id)
  );

  const records = queueRows.map((row) => {
    const conversation = conversationById.get(row.conversation_id);
    const isImpersonation = conversation?.channel === "agent_impersonation";
    const fallbackCustomerEmail =
      conversation?.customer_auth_user_id?.includes("@")
        ? conversation.customer_auth_user_id
        : undefined;
    const impersonatedCustomerLabel = isImpersonation
      ? parseImpersonatedCustomerLabel(conversation?.subject)
      : null;
    const customerName = conversation
      ? impersonatedCustomerLabel ??
        customerNameMap.get(conversation.customer_auth_user_id) ??
        fallbackCustomerEmail ??
        "Customer"
      : "Customer";
    const impersonationByName =
      isImpersonation && conversation
        ? (profileMap.get(conversation.customer_auth_user_id)?.name ?? "Employee")
        : null;
    const rep = row.claimed_by_auth_user_id
      ? profileMap.get(row.claimed_by_auth_user_id)
      : undefined;
    const resolvedByAuthUserId =
      resolvedByRequestId.get(row.id) ?? row.claimed_by_auth_user_id ?? null;
    const customerRating = customerRatingByRequestId.get(row.id) ?? null;

    return {
      requestId: row.id,
      conversationId: row.conversation_id,
      customerName,
      impersonationByName,
      reason: row.reason ?? undefined,
      status:
        row.status === "cancelled"
          ? "resolved"
          : (row.status as "pending" | "claimed" | "active" | "resolved"),
      position: pendingPositions.get(row.id) ?? 0,
      estimatedWaitSeconds: estimatedWaitSeconds(row.status),
      elapsedWaitSeconds: elapsedSeconds(row.requested_at),
      representative: rep,
      requestedAt: row.requested_at,
      claimedAt: row.claimed_at,
      claimedByAuthUserId: row.claimed_by_auth_user_id,
      resolvedAt: row.resolved_at,
      resolvedByAuthUserId,
      customerRating
    };
  });

  if (options?.resolvedScope === "agent") {
    return records.filter(
      (item) => item.status !== "resolved" || item.resolvedByAuthUserId === actorUserId
    );
  }

  return records;
}

export async function listRealtimeEvents(
  actorUserId: string,
  afterEventId?: string
): Promise<RealtimeEventsPage> {
  const supportAgent = await isAvaSupportAgent(actorUserId);
  const conversationRows = await listAccessibleConversationRows(actorUserId, supportAgent);
  const conversationIds = conversationRows.map((item) => item.id);
  if (conversationIds.length === 0) {
    return { events: [], latestEventId: undefined, cursorFound: !afterEventId };
  }

  const supabase = getSupabaseServiceRoleClient();
  const [messageResult, handoffEventResult] = await Promise.all([
    supabase
      .schema("ava")
      .from("messages")
      .select("id, conversation_id, sender_kind, sender_auth_user_id, body, payload, created_at")
      .in("conversation_id", conversationIds)
      .order("created_at", { ascending: false })
      .limit(500),
    supabase
      .schema("ava")
      .from("handoff_events")
      .select("id, handoff_request_id, conversation_id, event_type, payload, created_at")
      .in("conversation_id", conversationIds)
      .order("created_at", { ascending: false })
      .limit(500)
  ]);

  if (messageResult.error) {
    throw new StoreError(500, `Unable to load realtime message events: ${messageResult.error.message}`);
  }
  if (handoffEventResult.error) {
    throw new StoreError(500, `Unable to load realtime handoff events: ${handoffEventResult.error.message}`);
  }

  const messageRows = (messageResult.data ?? []) as MessageRow[];
  const handoffRows = (handoffEventResult.data ?? []) as HandoffEventRow[];

  const supportAgentIds = messageRows
    .map((row) => row.sender_auth_user_id)
    .filter((value): value is string => Boolean(value));
  const supportAgentMap = await getSupportAgentMap(supportAgentIds);

  const messageEvents: RealtimeEvent[] = messageRows.map((row) => ({
    id: `msg-${row.id}`,
    type: "message_created",
    conversationId: row.conversation_id,
    createdAt: row.created_at,
    payload: rowToTimelineMessage(row, supportAgentMap)
  }));

  const handoffEvents: RealtimeEvent[] = handoffRows
    .map((row) => {
      if (row.event_type === "queue_update" && row.payload?.kind === "typing") {
        return {
          id: `he-${row.id}`,
          type: "typing" as const,
          conversationId: row.conversation_id,
          createdAt: row.created_at,
          payload: row.payload ?? {}
        };
      }

      if (row.event_type === "requested") {
        return {
          id: `he-${row.id}`,
          type: "handoff_requested" as const,
          conversationId: row.conversation_id,
          createdAt: row.created_at,
          payload: row.payload ?? {}
        };
      }

      if (row.event_type === "resolved" || row.event_type === "cancelled") {
        return {
          id: `he-${row.id}`,
          type: "handoff_resolved" as const,
          conversationId: row.conversation_id,
          createdAt: row.created_at,
          payload: row.payload ?? {}
        };
      }

      return {
        id: `he-${row.id}`,
        type: "handoff_claimed" as const,
        conversationId: row.conversation_id,
        createdAt: row.created_at,
        payload: row.payload ?? {}
      };
    })
    .filter(Boolean);

  const typing = typingEvents.filter((event) => conversationIds.includes(event.conversationId));
  const merged = [...messageEvents, ...handoffEvents, ...typing].sort((a, b) => {
    if (a.createdAt === b.createdAt) {
      return a.id.localeCompare(b.id);
    }
    return a.createdAt.localeCompare(b.createdAt);
  });
  const latestEventId = merged.length > 0 ? merged[merged.length - 1]?.id : undefined;

  if (!afterEventId) {
    return {
      events: merged,
      latestEventId,
      cursorFound: true
    };
  }
  const index = merged.findIndex((item) => item.id === afterEventId);
  if (index < 0) {
    return {
      events: [],
      latestEventId,
      cursorFound: false
    };
  }
  return {
    events: merged.slice(index + 1),
    latestEventId,
    cursorFound: true
  };
}

export async function appendMessage(
  conversationId: string,
  message: AppendableMessageInput,
  actorUserId: string
): Promise<TimelineMessage> {
  const supportAgent = await isAvaSupportAgent(actorUserId);
  const conversation = requireConversationAccess(
    await getConversationRow(conversationId),
    actorUserId,
    supportAgent
  );

  if (message.kind === "customer" && conversation.customer_auth_user_id !== actorUserId) {
    throw new StoreError(403, "Only the customer can send customer messages.");
  }
  if (message.kind === "representative" && !supportAgent) {
    throw new StoreError(403, "Support-agent role required.");
  }
  if (message.kind === "ava" && !supportAgent) {
    throw new StoreError(403, "Support-agent role required.");
  }
  if (
    message.kind === "representative" &&
    conversation.handoff_state === "active" &&
    conversation.active_support_agent_auth_user_id &&
    conversation.active_support_agent_auth_user_id !== actorUserId
  ) {
    const adminOverride = await isAdminLike(actorUserId);
    if (!adminOverride) {
      throw new StoreError(403, "Only the assigned representative can send messages for this handoff.");
    }
  }

  const senderKind =
    message.kind === "representative"
      ? "support_agent"
      : message.kind;
  const senderAuthUserId = message.kind === "ava" ? null : actorUserId;
  const normalizedClientMessageId =
    message.kind === "customer" || message.kind === "representative"
      ? asTrimmedString(message.clientMessageId)
      : undefined;
  if (message.kind !== "ava" && message.clientMessageId && !normalizedClientMessageId) {
    throw new StoreError(400, "clientMessageId must be a non-empty string when provided.");
  }
  if (normalizedClientMessageId && normalizedClientMessageId.length > 128) {
    throw new StoreError(400, "clientMessageId must be 128 characters or fewer.");
  }

  const payload =
    message.kind === "representative"
      ? { representativeId: message.representativeId }
      : {};

  let clientMessageIdSupported = await hasClientMessageIdColumn();
  const selectColumnsWithClientMessageId =
    "id, conversation_id, sender_kind, sender_auth_user_id, client_message_id, body, payload, created_at" as const;
  const selectColumnsWithoutClientMessageId =
    "id, conversation_id, sender_kind, sender_auth_user_id, body, payload, created_at" as const;

  const supabase = getSupabaseServiceRoleClient();
  const fetchExistingIdempotentMessage = async () => {
    if (!clientMessageIdSupported || !normalizedClientMessageId || !senderAuthUserId) {
      return undefined;
    }
    const { data: existingRows, error: existingError } = await supabase
      .schema("ava")
      .from("messages")
      .select(selectColumnsWithClientMessageId)
      .eq("conversation_id", conversationId)
      .eq("sender_kind", senderKind)
      .eq("sender_auth_user_id", senderAuthUserId)
      .eq("client_message_id", normalizedClientMessageId)
      .order("created_at", { ascending: false })
      .limit(1);
    if (existingError) {
      if (isMissingClientMessageIdColumnError(existingError)) {
        supportsClientMessageIdColumn = false;
        clientMessageIdSupported = false;
        return undefined;
      }
      throw new StoreError(500, `Unable to load idempotent message: ${existingError.message}`);
    }
    return (((existingRows as MessageRow[] | null) ?? [])[0] ?? undefined) as MessageRow | undefined;
  };

  const existingIdempotentMessage = await fetchExistingIdempotentMessage();
  if (existingIdempotentMessage) {
    const supportAgentMap = await getSupportAgentMap(
      existingIdempotentMessage.sender_auth_user_id ? [existingIdempotentMessage.sender_auth_user_id] : []
    );
    return rowToTimelineMessage(existingIdempotentMessage, supportAgentMap);
  }

  const insertMessage = async (): Promise<{
    data: MessageRow | null;
    error: { message: string; code?: string } | null;
  }> => {
    if (clientMessageIdSupported) {
      const { data, error } = await supabase
        .schema("ava")
        .from("messages")
        .insert({
          conversation_id: conversationId,
          sender_kind: senderKind,
          sender_auth_user_id: senderAuthUserId,
          client_message_id: normalizedClientMessageId ?? null,
          body: message.text,
          payload
        })
        .select(selectColumnsWithClientMessageId)
        .single();
      return {
        data: (data as MessageRow | null) ?? null,
        error: (error as { message: string; code?: string } | null) ?? null
      };
    }

    const { data, error } = await supabase
      .schema("ava")
      .from("messages")
      .insert({
        conversation_id: conversationId,
        sender_kind: senderKind,
        sender_auth_user_id: senderAuthUserId,
        body: message.text,
        payload
      })
      .select(selectColumnsWithoutClientMessageId)
      .single();
    return {
      data: (data as MessageRow | null) ?? null,
      error: (error as { message: string; code?: string } | null) ?? null
    };
  };

  let { data, error } = await insertMessage();

  if (error && clientMessageIdSupported && isMissingClientMessageIdColumnError(error)) {
    // Allow environments that have not yet applied the idempotency migration.
    supportsClientMessageIdColumn = false;
    clientMessageIdSupported = false;
    const retry = await insertMessage();
    data = retry.data;
    error = retry.error;
  }

  if (error) {
    if (clientMessageIdSupported && isUniqueViolationError(error)) {
      const duplicate = await fetchExistingIdempotentMessage();
      if (duplicate) {
        const supportAgentMap = await getSupportAgentMap(
          duplicate.sender_auth_user_id ? [duplicate.sender_auth_user_id] : []
        );
        return rowToTimelineMessage(duplicate, supportAgentMap);
      }
    }
    throw new StoreError(500, `Unable to append message: ${error.message}`);
  }
  if (!data) {
    throw new StoreError(500, "Unable to append message.");
  }

  const updatedAt = nowIso();
  const { error: updateError } = await supabase
    .schema("ava")
    .from("conversations")
    .update({
      updated_at: updatedAt,
      last_message_at: updatedAt
    })
    .eq("id", conversationId);

  if (updateError) {
    throw new StoreError(500, `Unable to update conversation timestamp: ${updateError.message}`);
  }

  const supportAgentMap = await getSupportAgentMap(data.sender_auth_user_id ? [data.sender_auth_user_id] : []);
  return rowToTimelineMessage(data, supportAgentMap);
}

export async function appendAvaMessage(
  conversationId: string,
  text: string
): Promise<TimelineMessage> {
  const conversation = await getConversationRow(conversationId);
  if (!conversation) {
    throw new StoreError(404, "Conversation not found.");
  }

  const messageText = text.trim();
  if (!messageText) {
    throw new StoreError(400, "Ava message text is required.");
  }

  const supabase = getSupabaseServiceRoleClient();
  const { data, error } = await supabase
    .schema("ava")
    .from("messages")
    .insert({
      conversation_id: conversationId,
      sender_kind: "ava",
      sender_auth_user_id: null,
      body: messageText,
      payload: {}
    })
    .select("id, conversation_id, sender_kind, sender_auth_user_id, body, payload, created_at")
    .single();

  if (error) {
    throw new StoreError(500, `Unable to append Ava message: ${error.message}`);
  }

  const updatedAt = nowIso();
  const { error: updateError } = await supabase
    .schema("ava")
    .from("conversations")
    .update({
      updated_at: updatedAt,
      last_message_at: updatedAt
    })
    .eq("id", conversationId);

  if (updateError) {
    throw new StoreError(
      500,
      `Unable to update conversation timestamp for Ava message: ${updateError.message}`
    );
  }

  return rowToTimelineMessage(data as MessageRow, new Map<string, RepresentativeProfile>());
}

export async function requestHandoff(
  params: { conversationId: string; customerName: string; reason?: string },
  actorUserId: string
) {
  const supportAgent = await isAvaSupportAgent(actorUserId);
  requireConversationAccess(await getConversationRow(params.conversationId), actorUserId, supportAgent);

  const now = nowIso();
  const supabase = getSupabaseServiceRoleClient();
  const buildExistingOpenResponse = async (request: HandoffRequestRow) => {
    const pendingPositions = await getPendingQueuePositions();
    const representativeMap = request.claimed_by_auth_user_id
      ? await getSupportAgentMap([request.claimed_by_auth_user_id])
      : new Map<string, RepresentativeProfile>();
    const representative = request.claimed_by_auth_user_id
      ? representativeMap.get(request.claimed_by_auth_user_id)
      : undefined;
    const queue = toQueueRecordFromRequest({
      request,
      conversationId: params.conversationId,
      customerName: params.customerName,
      representative,
      pendingPosition: pendingPositions.get(request.id)
    });
    const thread = await getConversation(params.conversationId, actorUserId);
    if (!thread) {
      throw new StoreError(404, "Conversation not found.");
    }
    return { thread, queue };
  };

  const existingOpenRequest = await getLatestOpenHandoffRequest(params.conversationId);
  if (existingOpenRequest) {
    return buildExistingOpenResponse(existingOpenRequest);
  }

  let requestRow: HandoffRequestRow;
  {
    const { data, error } = await supabase
      .schema("ava")
      .from("handoff_requests")
      .insert({
        conversation_id: params.conversationId,
        requested_by_auth_user_id: actorUserId,
        status: "pending",
        reason: params.reason ?? null
      })
      .select(
        "id, conversation_id, status, reason, requested_at, claimed_at, claimed_by_auth_user_id, resolved_at"
      )
      .single();

    if (error) {
      if (isUniqueViolationError(error)) {
        const openRequest = await getLatestOpenHandoffRequest(params.conversationId);
        if (openRequest) {
          return buildExistingOpenResponse(openRequest);
        }
        throw new StoreError(409, "An open handoff request already exists for this conversation.");
      }
      throw new StoreError(500, `Unable to create handoff request: ${error.message}`);
    }

    requestRow = data as HandoffRequestRow;
  }

  const pendingPositions = await getPendingQueuePositions();
  const position = pendingPositions.get(requestRow.id) ?? 0;

  const queueSnapshot: QueueSnapshot = {
    requestId: requestRow.id,
    position,
    estimatedWaitSeconds: 180,
    elapsedWaitSeconds: 0,
    reason: params.reason
  };

  const { error: conversationUpdateError } = await supabase
    .schema("ava")
    .from("conversations")
    .update({
      status: "pending_handoff",
      handoff_state: "pending",
      updated_at: now
    })
    .eq("id", params.conversationId);

  if (conversationUpdateError) {
    throw new StoreError(
      500,
      `Unable to update conversation handoff state: ${conversationUpdateError.message}`
    );
  }

  const { data: systemMessageRow, error: messageError } = await supabase
    .schema("ava")
    .from("messages")
    .insert({
      conversation_id: params.conversationId,
      sender_kind: "system",
      sender_auth_user_id: null,
      body: "Request sent! Placing you in the support queue.",
      payload: {
        systemEvent: "request_sent",
        queue: queueSnapshot
      }
    })
    .select("id")
    .single();

  if (messageError) {
    throw new StoreError(500, `Unable to insert handoff system message: ${messageError.message}`);
  }

  const { error: eventError } = await supabase.schema("ava").from("handoff_events").insert({
    handoff_request_id: requestRow.id,
    conversation_id: params.conversationId,
    event_type: "requested",
    actor_auth_user_id: actorUserId,
    payload: {
      requestId: requestRow.id,
      reason: params.reason ?? null,
      systemMessageId: systemMessageRow.id
    }
  });

  if (eventError) {
    throw new StoreError(500, `Unable to insert handoff event: ${eventError.message}`);
  }

  const thread = await getConversation(params.conversationId, actorUserId);
  if (!thread) {
    throw new StoreError(404, "Conversation not found.");
  }

  const queueRecord: QueueRecord = {
    ...toQueueRecordFromRequest({
      request: requestRow,
      conversationId: params.conversationId,
      customerName: params.customerName,
      pendingPosition: position
    }),
    status: "pending",
    estimatedWaitSeconds: 180,
    elapsedWaitSeconds: 0
  };

  return {
    thread,
    queue: queueRecord
  };
}

export async function claimHandoff(
  params: { requestId: string; representative: RepresentativeProfile },
  actorUserId: string
) {
  const supportAgent = await isAvaSupportAgent(actorUserId);
  if (!supportAgent) {
    throw new StoreError(403, "Support-agent role required.");
  }

  const supabase = getSupabaseServiceRoleClient();
  const now = nowIso();
  const { data: claimedRequest, error: claimRequestError } = await supabase
    .schema("ava")
    .from("handoff_requests")
    .update({
      status: "claimed",
      claimed_by_auth_user_id: actorUserId,
      claimed_at: now
    })
    .eq("id", params.requestId)
    .eq("status", "pending")
    .select(
      "id, conversation_id, status, reason, requested_at, claimed_at, claimed_by_auth_user_id, resolved_at"
    )
    .maybeSingle();

  if (claimRequestError && !isNoRowsError(claimRequestError)) {
    throw new StoreError(500, `Unable to update handoff request: ${claimRequestError.message}`);
  }

  let updatedRequest = claimedRequest as HandoffRequestRow | null;
  if (!updatedRequest) {
    const { data: existingRequest, error: existingRequestError } = await supabase
      .schema("ava")
      .from("handoff_requests")
      .select(
        "id, conversation_id, status, reason, requested_at, claimed_at, claimed_by_auth_user_id, resolved_at"
      )
      .eq("id", params.requestId)
      .maybeSingle();

    if (existingRequestError) {
      throw new StoreError(500, `Unable to claim handoff: ${existingRequestError.message}`);
    }

    const requestRow = existingRequest as HandoffRequestRow | null;
    if (!requestRow) {
      throw new StoreError(404, `Handoff request not found: ${params.requestId}`);
    }
    if (requestRow.status === "resolved" || requestRow.status === "cancelled") {
      throw new StoreError(409, "Handoff request is already closed.");
    }

    if (
      requestRow.claimed_by_auth_user_id === actorUserId &&
      (requestRow.status === "claimed" || requestRow.status === "active")
    ) {
      const thread = await getConversation(requestRow.conversation_id, actorUserId);
      if (!thread) {
        throw new StoreError(404, "Conversation not found.");
      }
      const queuePresentation = await getQueueCustomerPresentationByConversationId(
        requestRow.conversation_id
      );
      return {
        thread,
        queue: toQueueRecordFromRequest({
          request: requestRow,
          conversationId: requestRow.conversation_id,
          customerName: queuePresentation.customerLabel,
          impersonationByName: queuePresentation.impersonationByName,
          representative: {
            id: actorUserId,
            name: params.representative.name || "Representative",
            avatarUrl: params.representative.avatarUrl
          }
        })
      };
    }

    throw new StoreError(409, "Handoff request already claimed or no longer pending.");
  }

  const representativeName = params.representative.name || "Representative";
  const queueSnapshot: QueueSnapshot = {
    requestId: updatedRequest.id,
    position: 0,
    estimatedWaitSeconds: 0,
    elapsedWaitSeconds: elapsedSeconds(updatedRequest.requested_at),
    reason: updatedRequest.reason ?? undefined
  };

  const { error: conversationUpdateError } = await supabase
    .schema("ava")
    .from("conversations")
    .update({
      status: "active_handoff",
      handoff_state: "active",
      active_support_agent_auth_user_id: actorUserId,
      updated_at: now
    })
    .eq("id", updatedRequest.conversation_id);

  if (conversationUpdateError) {
    throw new StoreError(500, `Unable to update conversation status: ${conversationUpdateError.message}`);
  }

  const { data: messageRow, error: messageError } = await supabase
    .schema("ava")
    .from("messages")
    .insert({
      conversation_id: updatedRequest.conversation_id,
      sender_kind: "system",
      sender_auth_user_id: actorUserId,
      body: `Connected with ${representativeName}!`,
      payload: {
        systemEvent: "connected",
        queue: queueSnapshot
      }
    })
    .select("id")
    .single();

  if (messageError) {
    throw new StoreError(500, `Unable to insert claim system message: ${messageError.message}`);
  }

  const { error: claimEventError } = await supabase.schema("ava").from("handoff_events").insert([
    {
      handoff_request_id: updatedRequest.id,
      conversation_id: updatedRequest.conversation_id,
      event_type: "claimed",
      actor_auth_user_id: actorUserId,
      payload: {
        representative: {
          id: actorUserId,
          name: representativeName
        }
      }
    },
    {
      handoff_request_id: updatedRequest.id,
      conversation_id: updatedRequest.conversation_id,
      event_type: "activated",
      actor_auth_user_id: actorUserId,
      payload: {
        representative: {
          id: actorUserId,
          name: representativeName
        },
        systemMessageId: messageRow.id
      }
    }
  ]);

  if (claimEventError) {
    throw new StoreError(500, `Unable to insert claim events: ${claimEventError.message}`);
  }

  const { data: activatedRequest, error: activateRequestError } = await supabase
    .schema("ava")
    .from("handoff_requests")
    .update({
      status: "active"
    })
    .eq("id", updatedRequest.id)
    .eq("status", "claimed")
    .select(
      "id, conversation_id, status, reason, requested_at, claimed_at, claimed_by_auth_user_id, resolved_at"
    )
    .maybeSingle();

  if (activateRequestError && !isNoRowsError(activateRequestError)) {
    throw new StoreError(500, `Unable to finalize handoff activation: ${activateRequestError.message}`);
  }
  if (activatedRequest) {
    updatedRequest = activatedRequest as HandoffRequestRow;
  }

  const thread = await getConversation(updatedRequest.conversation_id, actorUserId);
  if (!thread) {
    throw new StoreError(404, "Conversation not found.");
  }
  const queuePresentation = await getQueueCustomerPresentationByConversationId(
    updatedRequest.conversation_id
  );

  return {
    thread,
    queue: {
      ...toQueueRecordFromRequest({
        request: updatedRequest,
        conversationId: updatedRequest.conversation_id,
        customerName: queuePresentation.customerLabel,
        impersonationByName: queuePresentation.impersonationByName,
        representative: {
          id: actorUserId,
          name: representativeName
        }
      }),
      status: "active",
      position: 0,
      estimatedWaitSeconds: 0,
      elapsedWaitSeconds: elapsedSeconds(updatedRequest.requested_at),
      representative: {
        id: actorUserId,
        name: representativeName
      },
      requestedAt: updatedRequest.requested_at
    } as QueueRecord
  };
}

export async function resolveHandoff(
  params: { conversationId: string; resolutionNote?: string },
  actorUserId: string
) {
  const supportAgent = await isAvaSupportAgent(actorUserId);
  if (!supportAgent) {
    throw new StoreError(403, "Support-agent role required.");
  }

  requireConversationAccess(await getConversationRow(params.conversationId), actorUserId, supportAgent);

  const supabase = getSupabaseServiceRoleClient();
  const now = nowIso();
  const { data: latestRequestRows, error: latestRequestError } = await supabase
    .schema("ava")
    .from("handoff_requests")
    .select(
      "id, conversation_id, status, reason, requested_at, claimed_at, claimed_by_auth_user_id, resolved_at"
    )
    .eq("conversation_id", params.conversationId)
    .in("status", ["pending", "claimed", "active"])
    .order("requested_at", { ascending: false })
    .limit(1);

  if (latestRequestError) {
    throw new StoreError(500, `Unable to resolve handoff request state: ${latestRequestError.message}`);
  }

  const latestRequest = (latestRequestRows ?? [])[0] as HandoffRequestRow | undefined;
  if (latestRequest) {
    const adminOverride = await isAdminLike(actorUserId);
    if (
      latestRequest.claimed_by_auth_user_id &&
      latestRequest.claimed_by_auth_user_id !== actorUserId &&
      !adminOverride
    ) {
      throw new StoreError(409, "Only the assigned representative can resolve this handoff.");
    }

    const { data: resolvedRequest, error: requestUpdateError } = await supabase
      .schema("ava")
      .from("handoff_requests")
      .update({
        status: "resolved",
        resolved_at: now,
        resolution_note: params.resolutionNote ?? null
      })
      .eq("id", latestRequest.id)
      .in("status", ["pending", "claimed", "active"])
      .select("id")
      .maybeSingle();

    if (requestUpdateError) {
      throw new StoreError(500, `Unable to update handoff request: ${requestUpdateError.message}`);
    }
    if (!resolvedRequest) {
      throw new StoreError(409, "Handoff request is already resolved.");
    }
  }

  const { error: conversationUpdateError } = await supabase
    .schema("ava")
    .from("conversations")
    .update({
      status: "resolved",
      handoff_state: "resolved",
      active_support_agent_auth_user_id: null,
      updated_at: now
    })
    .eq("id", params.conversationId);

  if (conversationUpdateError) {
    throw new StoreError(500, `Unable to update conversation state: ${conversationUpdateError.message}`);
  }

  const representativeName =
    latestRequest?.claimed_by_auth_user_id
      ? (await getSupportAgentMap([latestRequest.claimed_by_auth_user_id])).get(
          latestRequest.claimed_by_auth_user_id
        )?.name ?? "your representative"
      : "your representative";

  const disconnectMessageText = latestRequest
    ? `Disconnected from ${representativeName}`
    : "Disconnected from representative";

  const { data: messageRow, error: messageError } = await supabase
    .schema("ava")
    .from("messages")
    .insert({
      conversation_id: params.conversationId,
      sender_kind: "system",
      sender_auth_user_id: actorUserId,
      body: disconnectMessageText,
      payload: {
        systemEvent: "disconnected"
      }
    })
    .select("id")
    .single();

  if (messageError) {
    throw new StoreError(500, `Unable to insert resolve system message: ${messageError.message}`);
  }

  let ratingPromptMessageId: string | null = null;
  if (latestRequest) {
    const { data: ratingPromptMessage, error: ratingPromptError } = await supabase
      .schema("ava")
      .from("messages")
      .insert({
        conversation_id: params.conversationId,
        sender_kind: "system",
        sender_auth_user_id: null,
        body: `Rate your experience with ${representativeName}`,
        payload: {
          systemEvent: "queue_update",
          feedbackRequest: {
            type: "handoff_rating",
            requestId: latestRequest.id,
            representativeName
          } satisfies HandoffFeedbackRequest
        }
      })
      .select("id")
      .single();

    if (ratingPromptError) {
      throw new StoreError(
        500,
        `Unable to insert handoff rating status message: ${ratingPromptError.message}`
      );
    }

    ratingPromptMessageId = ratingPromptMessage.id;
  }

  if (latestRequest) {
    const { error: eventError } = await supabase.schema("ava").from("handoff_events").insert({
      handoff_request_id: latestRequest.id,
      conversation_id: params.conversationId,
      event_type: "resolved",
      actor_auth_user_id: actorUserId,
      payload: {
        resolutionNote: params.resolutionNote ?? "",
        systemMessageId: messageRow.id,
        ratingPromptMessageId
      }
    });

    if (eventError) {
      throw new StoreError(500, `Unable to insert resolve event: ${eventError.message}`);
    }
  }

  const thread = await getConversation(params.conversationId, actorUserId);
  if (!thread) {
    throw new StoreError(404, "Conversation not found.");
  }

  return {
    thread
  };
}

export async function submitHandoffRating(
  params: { conversationId: string; rating: HandoffRating },
  actorUserId: string
) {
  const supportAgent = await isAvaSupportAgent(actorUserId);
  requireConversationAccess(await getConversationRow(params.conversationId), actorUserId, supportAgent);

  const supabase = getSupabaseServiceRoleClient();
  const { data: latestRequestRows, error: latestRequestError } = await supabase
    .schema("ava")
    .from("handoff_requests")
    .select(
      "id, conversation_id, status, reason, requested_at, claimed_at, claimed_by_auth_user_id, resolved_at"
    )
    .eq("conversation_id", params.conversationId)
    .eq("status", "resolved")
    .order("resolved_at", { ascending: false })
    .limit(1);

  if (latestRequestError) {
    throw new StoreError(500, `Unable to load resolved handoff request: ${latestRequestError.message}`);
  }

  const latestResolvedRequest = (latestRequestRows ?? [])[0] as HandoffRequestRow | undefined;
  if (!latestResolvedRequest) {
    throw new StoreError(409, "No resolved handoff was found for this conversation.");
  }

  const representativeName =
    latestResolvedRequest.claimed_by_auth_user_id
      ? (await getSupportAgentMap([latestResolvedRequest.claimed_by_auth_user_id])).get(
          latestResolvedRequest.claimed_by_auth_user_id
        )?.name ?? "your representative"
      : "your representative";

  const { error: ratingEventError } = await supabase.schema("ava").from("handoff_events").insert({
    handoff_request_id: latestResolvedRequest.id,
    conversation_id: params.conversationId,
    event_type: "queue_update",
    actor_auth_user_id: actorUserId,
    payload: {
      kind: "customer_rating",
      rating: params.rating
    }
  });

  if (ratingEventError) {
    throw new StoreError(500, `Unable to record handoff rating: ${ratingEventError.message}`);
  }

  const confirmationText =
    params.rating === "thumbs_up"
      ? `Thanks for rating your chat with ${representativeName}.`
      : `Thanks for rating your chat with ${representativeName}. We appreciate your feedback and will improve.`;

  const { error: confirmationMessageError } = await supabase.schema("ava").from("messages").insert({
    conversation_id: params.conversationId,
    sender_kind: "ava",
    sender_auth_user_id: null,
    body: confirmationText,
    payload: {
      feedbackRequest: {
        type: "handoff_rating",
        requestId: latestResolvedRequest.id,
        representativeName,
        submittedRating: params.rating
      }
    }
  });

  if (confirmationMessageError) {
    throw new StoreError(
      500,
      `Unable to insert handoff rating confirmation message: ${confirmationMessageError.message}`
    );
  }

  const updatedAt = nowIso();
  const { error: conversationUpdateError } = await supabase
    .schema("ava")
    .from("conversations")
    .update({
      updated_at: updatedAt,
      last_message_at: updatedAt
    })
    .eq("id", params.conversationId);

  if (conversationUpdateError) {
    throw new StoreError(
      500,
      `Unable to update conversation timestamp for rating: ${conversationUpdateError.message}`
    );
  }

  const thread = await getConversation(params.conversationId, actorUserId);
  if (!thread) {
    throw new StoreError(404, "Conversation not found.");
  }

  return {
    thread
  };
}

function mapSupportAgentNoteRow(
  row: SupportAgentNoteRow,
  supportAgentMap: Map<string, RepresentativeProfile>
): SupportAgentNote {
  const authorProfile = supportAgentMap.get(row.author_auth_user_id);
  return {
    id: row.id,
    conversationId: row.conversation_id,
    author: {
      id: row.author_auth_user_id,
      name: authorProfile?.name ?? "Support Agent"
    },
    body: row.body,
    createdAt: row.created_at
  };
}

export async function listSupportAgentNotes(
  conversationId: string,
  actorUserId: string
): Promise<SupportAgentNote[]> {
  const supportAgent = await isAvaSupportAgent(actorUserId);
  if (!supportAgent) {
    throw new StoreError(403, "Support-agent role required.");
  }

  requireConversationAccess(await getConversationRow(conversationId), actorUserId, supportAgent);

  const supabase = getSupabaseServiceRoleClient();
  const { data, error } = await supabase
    .schema("ava")
    .from("support_agent_notes")
    .select("id, conversation_id, author_auth_user_id, body, created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    throw new StoreError(500, `Unable to load support notes: ${error.message}`);
  }

  const noteRows = (data ?? []) as SupportAgentNoteRow[];
  const authorIds = noteRows.map((row) => row.author_auth_user_id);
  const supportAgentMap = await getSupportAgentMap(authorIds);

  return noteRows.map((row) => mapSupportAgentNoteRow(row, supportAgentMap));
}

export async function createSupportAgentNote(
  conversationId: string,
  body: string,
  actorUserId: string
): Promise<SupportAgentNote> {
  const supportAgent = await isAvaSupportAgent(actorUserId);
  if (!supportAgent) {
    throw new StoreError(403, "Support-agent role required.");
  }

  requireConversationAccess(await getConversationRow(conversationId), actorUserId, supportAgent);

  const trimmedBody = body.trim();
  if (!trimmedBody) {
    throw new StoreError(400, "Note body is required.");
  }

  const supabase = getSupabaseServiceRoleClient();
  const { data, error } = await supabase
    .schema("ava")
    .from("support_agent_notes")
    .insert({
      conversation_id: conversationId,
      author_auth_user_id: actorUserId,
      body: trimmedBody
    })
    .select("id, conversation_id, author_auth_user_id, body, created_at")
    .single();

  if (error) {
    throw new StoreError(500, `Unable to create support note: ${error.message}`);
  }

  const supportAgentMap = await getSupportAgentMap([actorUserId]);
  return mapSupportAgentNoteRow(data as SupportAgentNoteRow, supportAgentMap);
}

async function getCustomerProfileDetails(conversation: ConversationDetailsRow) {
  const supabase = getSupabaseServiceRoleClient();

  if (conversation.customer_profile_id) {
    const { data, error } = await supabase
      .schema("ava")
      .from("customer_profiles")
      .select("id, auth_user_id, email, full_name, phone, project_customer_id, metadata")
      .eq("id", conversation.customer_profile_id)
      .single();

    if (error && !isNoRowsError(error)) {
      throw new StoreError(500, `Unable to load customer profile by id: ${error.message}`);
    }
    if (data) {
      return data as CustomerProfileDetailsRow;
    }
  }

  const { data, error } = await supabase
    .schema("ava")
    .from("customer_profiles")
    .select("id, auth_user_id, email, full_name, phone, project_customer_id, metadata")
    .eq("auth_user_id", conversation.customer_auth_user_id)
    .order("created_at", { ascending: false })
    .limit(1);

  if (error) {
    throw new StoreError(500, `Unable to load customer profile by auth user: ${error.message}`);
  }

  return ((data ?? [])[0] ?? undefined) as CustomerProfileDetailsRow | undefined;
}

async function getConversationDetailsRow(conversationId: string) {
  const supabase = getSupabaseServiceRoleClient();
  const { data, error } = await supabase
    .schema("ava")
    .from("conversations")
    .select(
      "id, customer_auth_user_id, handoff_state, active_support_agent_auth_user_id, updated_at, customer_profile_id, project_ref"
    )
    .eq("id", conversationId)
    .single();

  if (error && !isNoRowsError(error)) {
    throw new StoreError(500, `Unable to load conversation details: ${error.message}`);
  }

  return (data ?? undefined) as ConversationDetailsRow | undefined;
}

async function resolveCustomerProjectDetails(
  conversation: ConversationDetailsRow,
  customerProfile: CustomerProfileDetailsRow | undefined
): Promise<ResolvedCustomerProjectDetails> {
  const metadata = asRecord(customerProfile?.metadata) ?? {};
  const projectMetadata = asRecord(metadata.project) ?? {};

  const address = firstStringValue([
    metadata.address,
    metadata.customer_address,
    metadata.customerAddress,
    metadata.site_address,
    metadata.siteAddress,
    projectMetadata.address,
    projectMetadata.site_address,
    projectMetadata.siteAddress
  ]);

  const fin = firstStringValue([
    metadata.fin,
    metadata.fin_number,
    metadata.finNumber,
    metadata.finance_id,
    metadata.financeId
  ]);

  const projectRef = firstStringValue([
    conversation.project_ref,
    metadata.project_ref,
    metadata.projectRef,
    projectMetadata.ref,
    projectMetadata.project_ref,
    projectMetadata.projectRef
  ]);

  const projectStatus = firstStringValue([
    projectMetadata.status,
    metadata.project_status,
    metadata.projectStatus
  ]);

  const siteAddress = firstStringValue([
    projectMetadata.address,
    projectMetadata.site_address,
    projectMetadata.siteAddress,
    metadata.site_address,
    metadata.siteAddress
  ]);

  let mysqlProjectData: Awaited<ReturnType<typeof getMySqlCustomerProjectDetails>> | undefined;
  try {
    mysqlProjectData = await getMySqlCustomerProjectDetails({
      projectRef,
      customerId: customerProfile?.project_customer_id,
      email: customerProfile?.email
    });
  } catch {
    mysqlProjectData = undefined;
  }

  const customerId = customerProfile?.project_customer_id ?? mysqlProjectData?.customerId ?? null;
  const customerFullName =
    asTrimmedString(customerProfile?.full_name) ?? mysqlProjectData?.customerName ?? null;
  const customerEmail = asTrimmedString(customerProfile?.email) ?? mysqlProjectData?.email ?? null;
  const customerPhone = asTrimmedString(customerProfile?.phone) ?? mysqlProjectData?.phone ?? null;
  const customerAddress = address ?? mysqlProjectData?.fullAddress ?? null;
  const customerFin = fin ?? mysqlProjectData?.financeId ?? null;
  const resolvedProjectRef = projectRef ?? mysqlProjectData?.projectId ?? null;
  const resolvedProjectStatus = projectStatus ?? mysqlProjectData?.projectStatus ?? null;
  const resolvedSiteAddress = siteAddress ?? mysqlProjectData?.fullAddress ?? customerAddress;

  const responseMetadata: Record<string, unknown> = {
    ...metadata
  };
  if (mysqlProjectData) {
    responseMetadata.mysql_project_data = {
      matchedBy: mysqlProjectData.matchedBy,
      projectTitle: mysqlProjectData.projectTitle
    };
  }

  return {
    customerId,
    customerFullName,
    customerEmail,
    customerPhone,
    customerAddress,
    customerFin,
    projectRef: resolvedProjectRef,
    projectStatus: resolvedProjectStatus,
    siteAddress: resolvedSiteAddress,
    metadata: responseMetadata
  };
}

export async function getConversationCustomerDetails(
  conversationId: string,
  actorUserId: string
): Promise<ConversationCustomerDetails> {
  const supportAgent = await isAvaSupportAgent(actorUserId);
  if (!supportAgent) {
    throw new StoreError(403, "Support-agent role required.");
  }

  const conversation = requireConversationAccess(
    await getConversationDetailsRow(conversationId),
    actorUserId,
    supportAgent
  ) as ConversationDetailsRow;

  const customerProfile = await getCustomerProfileDetails(conversation);
  const resolved = await resolveCustomerProjectDetails(conversation, customerProfile);

  return {
    conversationId: conversation.id,
    customer: {
      authUserId: conversation.customer_auth_user_id,
      profileId: customerProfile?.id ?? null,
      customerId: resolved.customerId,
      fullName: resolved.customerFullName,
      email: resolved.customerEmail,
      phone: resolved.customerPhone,
      address: resolved.customerAddress,
      fin: resolved.customerFin
    },
    project: {
      projectRef: resolved.projectRef,
      projectStatus: resolved.projectStatus,
      siteAddress: resolved.siteAddress,
      metadata: resolved.metadata
    }
  };
}

export async function getAvaConversationContext(
  conversationId: string,
  actorUserId: string
): Promise<AvaConversationContext> {
  const supportAgent = await isAvaSupportAgent(actorUserId);
  const conversation = requireConversationAccess(
    await getConversationDetailsRow(conversationId),
    actorUserId,
    supportAgent
  ) as ConversationDetailsRow;

  const customerProfile = await getCustomerProfileDetails(conversation);
  const resolved = await resolveCustomerProjectDetails(conversation, customerProfile);

  return {
    conversationId: conversation.id,
    handoffState: conversation.handoff_state,
    customer: {
      customerId: resolved.customerId,
      fullName: resolved.customerFullName,
      email: resolved.customerEmail,
      phone: resolved.customerPhone,
      address: resolved.customerAddress,
      fin: resolved.customerFin
    },
    project: {
      projectRef: resolved.projectRef,
      projectStatus: resolved.projectStatus,
      siteAddress: resolved.siteAddress,
      metadata: resolved.metadata
    }
  };
}

export async function publishTypingEvent(
  params: {
    conversationId: string;
    actor: "customer" | "representative";
    isTyping: boolean;
  },
  actorUserId: string
) {
  const supportAgent = await isAvaSupportAgent(actorUserId);
  const conversation = requireConversationAccess(
    await getConversationRow(params.conversationId),
    actorUserId,
    supportAgent
  );

  if (params.actor === "customer" && conversation.customer_auth_user_id !== actorUserId) {
    throw new StoreError(403, "Only the customer can publish customer typing events.");
  }
  if (params.actor === "representative" && !supportAgent) {
    throw new StoreError(403, "Support-agent role required.");
  }

  typingEvents.push({
    id: randomId("typing"),
    type: "typing",
    conversationId: params.conversationId,
    createdAt: nowIso(),
    payload: {
      ...params
    }
  });

  if (typingEvents.length > 500) {
    typingEvents.splice(0, typingEvents.length - 500);
  }
}
