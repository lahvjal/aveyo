import { type AppRole } from "@/lib/auth/types";
import { ServiceError } from "@/lib/service-error";
import { getSupabaseServiceRoleClient } from "@/lib/supabase/server";

type PresenceStatus = "online" | "offline";

interface SupportAgentPresenceRow {
  agent_auth_user_id: string;
  desired_status: PresenceStatus;
  last_heartbeat_at: string | null;
  last_transition_at: string;
  created_at: string;
  updated_at: string;
}

export interface SupportPresenceResult {
  status: PresenceStatus;
  desiredStatus: PresenceStatus;
  lastHeartbeatAt: string | null;
  heartbeatTtlSeconds: number;
}

const PRESENCE_HEARTBEAT_TTL_SECONDS = 90;
const PRESENCE_HEARTBEAT_TTL_MS = PRESENCE_HEARTBEAT_TTL_SECONDS * 1000;

function assertSupportPresenceAccess(role: AppRole) {
  if (role === "support_agent" || role === "super_admin") {
    return;
  }
  throw new ServiceError(403, "Support agent dashboard access required.");
}

function parseIsoToMs(value: string | null | undefined) {
  if (!value) {
    return null;
  }
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : null;
}

function isHeartbeatFresh(lastHeartbeatAt: string | null) {
  const heartbeatMs = parseIsoToMs(lastHeartbeatAt);
  if (heartbeatMs === null) {
    return false;
  }
  return Date.now() - heartbeatMs <= PRESENCE_HEARTBEAT_TTL_MS;
}

function toPresenceResult(row: SupportAgentPresenceRow): SupportPresenceResult {
  const status: PresenceStatus =
    row.desired_status === "online" && isHeartbeatFresh(row.last_heartbeat_at)
      ? "online"
      : "offline";
  return {
    status,
    desiredStatus: row.desired_status,
    lastHeartbeatAt: row.last_heartbeat_at,
    heartbeatTtlSeconds: PRESENCE_HEARTBEAT_TTL_SECONDS
  };
}

async function fetchPresenceRow(agentAuthUserId: string) {
  const supabase = getSupabaseServiceRoleClient();
  const { data, error } = await supabase
    .schema("ava")
    .from("support_agent_presence")
    .select(
      "agent_auth_user_id, desired_status, last_heartbeat_at, last_transition_at, created_at, updated_at"
    )
    .eq("agent_auth_user_id", agentAuthUserId)
    .maybeSingle();

  if (error) {
    throw new ServiceError(500, `Unable to load support presence: ${error.message}`);
  }

  return (data ?? null) as SupportAgentPresenceRow | null;
}

async function upsertPresenceRow(params: {
  agentAuthUserId: string;
  desiredStatus: PresenceStatus;
  lastHeartbeatAt: string | null;
}) {
  const nowIso = new Date().toISOString();
  const supabase = getSupabaseServiceRoleClient();
  const { data, error } = await supabase
    .schema("ava")
    .from("support_agent_presence")
    .upsert(
      {
        agent_auth_user_id: params.agentAuthUserId,
        desired_status: params.desiredStatus,
        last_heartbeat_at: params.lastHeartbeatAt,
        last_transition_at: nowIso,
        updated_at: nowIso
      },
      {
        onConflict: "agent_auth_user_id"
      }
    )
    .select(
      "agent_auth_user_id, desired_status, last_heartbeat_at, last_transition_at, created_at, updated_at"
    )
    .single();

  if (error) {
    throw new ServiceError(500, `Unable to update support presence: ${error.message}`);
  }

  return data as SupportAgentPresenceRow;
}

export async function getSupportPresenceResult(actorUserId: string, actorRole: AppRole) {
  assertSupportPresenceAccess(actorRole);

  const existing = await fetchPresenceRow(actorUserId);
  if (existing) {
    return toPresenceResult(existing);
  }

  const created = await upsertPresenceRow({
    agentAuthUserId: actorUserId,
    desiredStatus: "online",
    lastHeartbeatAt: new Date().toISOString()
  });
  return toPresenceResult(created);
}

export async function setSupportPresenceOnlineResult(actorUserId: string, actorRole: AppRole) {
  assertSupportPresenceAccess(actorRole);
  const updated = await upsertPresenceRow({
    agentAuthUserId: actorUserId,
    desiredStatus: "online",
    lastHeartbeatAt: new Date().toISOString()
  });
  return toPresenceResult(updated);
}

export async function setSupportPresenceOfflineResult(actorUserId: string, actorRole: AppRole) {
  assertSupportPresenceAccess(actorRole);
  const updated = await upsertPresenceRow({
    agentAuthUserId: actorUserId,
    desiredStatus: "offline",
    lastHeartbeatAt: null
  });
  return toPresenceResult(updated);
}

export async function heartbeatSupportPresenceResult(actorUserId: string, actorRole: AppRole) {
  assertSupportPresenceAccess(actorRole);

  const existing = await fetchPresenceRow(actorUserId);
  if (!existing) {
    const created = await upsertPresenceRow({
      agentAuthUserId: actorUserId,
      desiredStatus: "online",
      lastHeartbeatAt: new Date().toISOString()
    });
    return toPresenceResult(created);
  }

  if (existing.desired_status === "offline") {
    return toPresenceResult(existing);
  }

  const nowIso = new Date().toISOString();
  const supabase = getSupabaseServiceRoleClient();
  const { data, error } = await supabase
    .schema("ava")
    .from("support_agent_presence")
    .update({
      last_heartbeat_at: nowIso,
      updated_at: nowIso
    })
    .eq("agent_auth_user_id", actorUserId)
    .eq("desired_status", "online")
    .select(
      "agent_auth_user_id, desired_status, last_heartbeat_at, last_transition_at, created_at, updated_at"
    )
    .single();

  if (error) {
    throw new ServiceError(500, `Unable to heartbeat support presence: ${error.message}`);
  }

  return toPresenceResult(data as SupportAgentPresenceRow);
}

export async function getOnlineSupportAgentIds(agentAuthUserIds: string[]) {
  const uniqueIds = Array.from(new Set(agentAuthUserIds.filter(Boolean)));
  if (uniqueIds.length === 0) {
    return new Set<string>();
  }

  const supabase = getSupabaseServiceRoleClient();
  const { data, error } = await supabase
    .schema("ava")
    .from("support_agent_presence")
    .select("agent_auth_user_id, desired_status, last_heartbeat_at")
    .in("agent_auth_user_id", uniqueIds)
    .eq("desired_status", "online");

  if (error) {
    throw new ServiceError(500, `Unable to load online support agents: ${error.message}`);
  }

  const onlineIds = new Set<string>();
  for (const row of (data ?? []) as Array<{
    agent_auth_user_id: string;
    desired_status: PresenceStatus;
    last_heartbeat_at: string | null;
  }>) {
    if (!row.agent_auth_user_id) {
      continue;
    }
    if (!isHeartbeatFresh(row.last_heartbeat_at)) {
      continue;
    }
    onlineIds.add(row.agent_auth_user_id);
  }

  return onlineIds;
}
