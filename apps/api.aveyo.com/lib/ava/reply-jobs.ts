import { getSupabaseServiceRoleClient } from "@/lib/supabase/server";

export type AvaReplyJobStatus = "pending" | "processing" | "completed" | "failed" | "cancelled";

interface AvaReplyJobRow {
  id: string;
  conversation_id: string;
  trigger_message_id: string;
  requested_by_auth_user_id: string;
  status: AvaReplyJobStatus;
  available_at: string;
  claimed_by: string | null;
  claimed_at: string | null;
  lease_expires_at: string | null;
  attempts: number;
  last_error: string | null;
  reply_message_id: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AvaReplyJob {
  id: string;
  conversationId: string;
  triggerMessageId: string;
  requestedByAuthUserId: string;
  status: AvaReplyJobStatus;
  availableAt: string;
  claimedBy: string | null;
  claimedAt: string | null;
  leaseExpiresAt: string | null;
  attempts: number;
  lastError: string | null;
  replyMessageId: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

function mapReplyJobRow(row: AvaReplyJobRow): AvaReplyJob {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    triggerMessageId: row.trigger_message_id,
    requestedByAuthUserId: row.requested_by_auth_user_id,
    status: row.status,
    availableAt: row.available_at,
    claimedBy: row.claimed_by,
    claimedAt: row.claimed_at,
    leaseExpiresAt: row.lease_expires_at,
    attempts: row.attempts,
    lastError: row.last_error,
    replyMessageId: row.reply_message_id,
    completedAt: row.completed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function isUniqueViolationError(error: { code?: string } | null | undefined) {
  return error?.code === "23505";
}

export function isAvaReplyJobsUnavailableError(error: unknown) {
  const message = error instanceof Error ? error.message.toLowerCase() : "";
  return (
    message.includes("reply_jobs") ||
    message.includes("claim_ava_reply_jobs") ||
    message.includes("ava reply job")
  );
}

const REPLY_JOB_SELECT =
  "id, conversation_id, trigger_message_id, requested_by_auth_user_id, status, available_at, claimed_by, claimed_at, lease_expires_at, attempts, last_error, reply_message_id, completed_at, created_at, updated_at";

export async function enqueueAvaReplyJob(params: {
  conversationId: string;
  triggerMessageId: string;
  requestedByAuthUserId: string;
}) {
  const supabase = getSupabaseServiceRoleClient();
  const { data, error } = await supabase
    .schema("ava")
    .from("reply_jobs")
    .insert({
      conversation_id: params.conversationId,
      trigger_message_id: params.triggerMessageId,
      requested_by_auth_user_id: params.requestedByAuthUserId,
      status: "pending",
      available_at: new Date().toISOString()
    })
    .select(REPLY_JOB_SELECT)
    .single();

  if (error) {
    if (isUniqueViolationError(error)) {
      const { data: existingRows, error: existingError } = await supabase
        .schema("ava")
        .from("reply_jobs")
        .select(REPLY_JOB_SELECT)
        .eq("trigger_message_id", params.triggerMessageId)
        .limit(1);
      if (existingError) {
        throw new Error(`Unable to load existing Ava reply job: ${existingError.message}`);
      }
      const existing = ((existingRows ?? [])[0] ?? null) as AvaReplyJobRow | null;
      if (existing) {
        return mapReplyJobRow(existing);
      }
    }
    throw new Error(`Unable to enqueue Ava reply job: ${error.message}`);
  }

  return mapReplyJobRow(data as AvaReplyJobRow);
}

export async function claimAvaReplyJobs(params: {
  owner: string;
  limit?: number;
  conversationId?: string;
}) {
  const supabase = getSupabaseServiceRoleClient();
  const { data, error } = await supabase.rpc("claim_ava_reply_jobs", {
    p_owner: params.owner,
    p_limit: params.limit ?? 10,
    p_lease_seconds: 120,
    p_conversation_id: params.conversationId ?? null
  });

  if (error) {
    throw new Error(`Unable to claim Ava reply jobs: ${error.message}`);
  }

  return ((data ?? []) as AvaReplyJobRow[]).map(mapReplyJobRow);
}

async function updateClaimedReplyJob(
  params: {
    jobId: string;
    owner: string;
  },
  patch: Record<string, unknown>
) {
  const supabase = getSupabaseServiceRoleClient();
  const { error } = await supabase
    .schema("ava")
    .from("reply_jobs")
    .update(patch)
    .eq("id", params.jobId)
    .eq("claimed_by", params.owner);

  if (error) {
    throw new Error(`Unable to update Ava reply job: ${error.message}`);
  }
}

export async function completeAvaReplyJob(params: {
  jobId: string;
  owner: string;
  replyMessageId?: string | null;
}) {
  await updateClaimedReplyJob(
    {
      jobId: params.jobId,
      owner: params.owner
    },
    {
      status: "completed",
      reply_message_id: params.replyMessageId ?? null,
      completed_at: new Date().toISOString(),
      claimed_by: null,
      claimed_at: null,
      lease_expires_at: null,
      last_error: null
    }
  );
}

export async function cancelAvaReplyJob(params: {
  jobId: string;
  owner: string;
  reason: string;
}) {
  await updateClaimedReplyJob(
    {
      jobId: params.jobId,
      owner: params.owner
    },
    {
      status: "cancelled",
      completed_at: new Date().toISOString(),
      claimed_by: null,
      claimed_at: null,
      lease_expires_at: null,
      last_error: params.reason
    }
  );
}

export async function failAvaReplyJob(params: {
  jobId: string;
  owner: string;
  errorMessage: string;
  retryAfterMs?: number;
}) {
  await updateClaimedReplyJob(
    {
      jobId: params.jobId,
      owner: params.owner
    },
    {
      status: "failed",
      available_at: new Date(Date.now() + Math.max(params.retryAfterMs ?? 15_000, 1_000)).toISOString(),
      claimed_by: null,
      claimed_at: null,
      lease_expires_at: null,
      last_error: params.errorMessage
    }
  );
}
