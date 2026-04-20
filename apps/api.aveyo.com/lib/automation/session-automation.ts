import { randomUUID } from "node:crypto";
import { performance } from "node:perf_hooks";
import { runDueSessionAutomationBatch, type SessionAutomationBatchResult } from "@/lib/store/mock-store";
import { getSupabaseServiceRoleClient } from "@/lib/supabase/server";

const AUTOMATION_TASK_KEY = "ava-session-automation";
const AUTOMATION_LEASE_SECONDS = 180;

interface ClaimAutomationLeaseRow {
  acquired: boolean;
  lease_expires_at: string | null;
}

export interface AvaSessionAutomationRunResult extends SessionAutomationBatchResult {
  acquiredLease: boolean;
  leaseExpiresAt: string | null;
  owner: string;
  durationMs: number;
}

function createLeaseOwner() {
  const region = process.env.VERCEL_REGION?.trim() || "local";
  return `${region}:${process.pid}:${randomUUID()}`;
}

async function claimLease(owner: string) {
  const supabase = getSupabaseServiceRoleClient();
  const { data, error } = await supabase.rpc("claim_ava_automation_lease", {
    p_task_key: AUTOMATION_TASK_KEY,
    p_owner: owner,
    p_lease_seconds: AUTOMATION_LEASE_SECONDS
  });

  if (error) {
    throw new Error(`Unable to claim Ava automation lease: ${error.message}`);
  }

  const claim = ((data ?? [])[0] ?? null) as ClaimAutomationLeaseRow | null;
  return {
    acquired: Boolean(claim?.acquired),
    leaseExpiresAt: claim?.lease_expires_at ?? null
  };
}

async function releaseLease(owner: string, errorMessage?: string) {
  const supabase = getSupabaseServiceRoleClient();
  const { error } = await supabase.rpc("release_ava_automation_lease", {
    p_task_key: AUTOMATION_TASK_KEY,
    p_owner: owner,
    p_error: errorMessage ?? null
  });

  if (error) {
    console.error("Unable to release Ava automation lease", {
      error: error.message
    });
  }
}

export async function runAvaSessionAutomationSweep(): Promise<AvaSessionAutomationRunResult> {
  const startedAt = performance.now();
  const owner = createLeaseOwner();
  const claim = await claimLease(owner);

  if (!claim.acquired) {
    return {
      acquiredLease: false,
      leaseExpiresAt: claim.leaseExpiresAt,
      owner,
      durationMs: Number((performance.now() - startedAt).toFixed(2)),
      idleCandidates: 0,
      idlePrompted: 0,
      idleClosed: 0,
      idleFailures: 0,
      resolvedCandidates: 0,
      resolvedClosed: 0,
      resolvedFailures: 0
    };
  }

  let releaseErrorMessage: string | undefined;
  try {
    const result = await runDueSessionAutomationBatch();
    return {
      acquiredLease: true,
      leaseExpiresAt: claim.leaseExpiresAt,
      owner,
      durationMs: Number((performance.now() - startedAt).toFixed(2)),
      ...result
    };
  } catch (error) {
    releaseErrorMessage = error instanceof Error ? error.message : "Unknown automation error";
    throw error;
  } finally {
    await releaseLease(owner, releaseErrorMessage);
  }
}
