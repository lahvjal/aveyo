import { getSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { sendGChatPendingHandoffAlert } from "@/lib/gchat/notify";

/** How long a handoff must stay pending (unclaimed) before GChat is notified. */
export const PENDING_THRESHOLD_SECONDS = 5;

export interface SchedulePendingHandoffGChatAlertParams {
  requestId: string;
  conversationId: string;
  reason: string | null;
  requestedAt: string;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Waits for the pending threshold, then sends a GChat alert if the handoff is still unclaimed.
 * Intended to run inside Next.js `after()` from the handoff request path.
 */
export async function schedulePendingHandoffGChatAlert(
  params: SchedulePendingHandoffGChatAlertParams
): Promise<void> {
  const webhookUrl = process.env.GOOGLE_CHAT_WEBHOOK_URL?.trim() ?? null;
  if (!webhookUrl) {
    console.warn(
      "GOOGLE_CHAT_WEBHOOK_URL is not configured; pending handoff GChat alerts are disabled."
    );
    return;
  }

  await sleep(PENDING_THRESHOLD_SECONDS * 1000);

  const supabase = getSupabaseServiceRoleClient();
  const { data, error } = await supabase
    .schema("ava")
    .from("handoff_requests")
    .select("id, conversation_id, reason, requested_at, status, gchat_alerted_at")
    .eq("id", params.requestId)
    .maybeSingle();

  if (error) {
    console.error("Pending handoff alert lookup failed", {
      requestId: params.requestId,
      error: error.message,
    });
    return;
  }

  if (!data || data.status !== "pending" || data.gchat_alerted_at != null) {
    return;
  }

  try {
    const result = await sendGChatPendingHandoffAlert({
      requestId: data.id,
      conversationId: data.conversation_id,
      reason: data.reason,
      requestedAt: data.requested_at,
      webhookUrl,
    });

    if (!result.ok) {
      console.error("GChat webhook returned non-OK status", {
        requestId: data.id,
        status: result.status,
      });
      return;
    }

    const { error: updateError } = await supabase
      .schema("ava")
      .from("handoff_requests")
      .update({ gchat_alerted_at: new Date().toISOString() })
      .eq("id", data.id)
      .is("gchat_alerted_at", null);

    if (updateError) {
      console.error("Failed to stamp gchat_alerted_at", {
        requestId: data.id,
        error: updateError.message,
      });
    }
  } catch (err) {
    console.error("Failed to send GChat pending handoff alert", {
      requestId: params.requestId,
      error: err,
    });
  }
}
