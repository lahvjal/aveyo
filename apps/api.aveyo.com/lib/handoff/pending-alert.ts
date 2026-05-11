import { getSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { sendGChatPendingHandoffAlert } from "@/lib/gchat/notify";

const PENDING_THRESHOLD_MINUTES = 3;

export interface PendingAlertSweepResult {
  checked: number;
  alerted: number;
  failed: number;
  skippedNoWebhook: boolean;
}

interface PendingHandoffRow {
  id: string;
  conversation_id: string;
  reason: string | null;
  requested_at: string;
}

export async function runPendingHandoffAlertSweep(): Promise<PendingAlertSweepResult> {
  const webhookUrl = process.env.GOOGLE_CHAT_WEBHOOK_URL?.trim() ?? null;

  if (!webhookUrl) {
    return { checked: 0, alerted: 0, failed: 0, skippedNoWebhook: true };
  }

  const supabase = getSupabaseServiceRoleClient();

  const thresholdTime = new Date(
    Date.now() - PENDING_THRESHOLD_MINUTES * 60 * 1000
  ).toISOString();

  const { data, error } = await supabase
    .schema("ava")
    .from("handoff_requests")
    .select("id, conversation_id, reason, requested_at")
    .eq("status", "pending")
    .lt("requested_at", thresholdTime)
    .is("gchat_alerted_at", null);

  if (error) {
    throw new Error(`Pending handoff alert query failed: ${error.message}`);
  }

  const rows = (data ?? []) as PendingHandoffRow[];
  let alerted = 0;
  let failed = 0;

  for (const row of rows) {
    try {
      const result = await sendGChatPendingHandoffAlert({
        requestId: row.id,
        conversationId: row.conversation_id,
        reason: row.reason,
        requestedAt: row.requested_at,
        webhookUrl,
      });

      if (result.ok) {
        await supabase
          .schema("ava")
          .from("handoff_requests")
          .update({ gchat_alerted_at: new Date().toISOString() })
          .eq("id", row.id);
        alerted++;
      } else {
        console.error("GChat webhook returned non-OK status", {
          requestId: row.id,
          status: result.status,
        });
        failed++;
      }
    } catch (err) {
      console.error("Failed to send GChat pending handoff alert", {
        requestId: row.id,
        error: err,
      });
      failed++;
    }
  }

  return { checked: rows.length, alerted, failed, skippedNoWebhook: false };
}
