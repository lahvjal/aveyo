import { getSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { sendGChatHandoffRequestedAlert } from "@/lib/gchat/notify";

export interface HandoffRequestedGChatAlertParams {
  requestId: string;
  conversationId: string;
  reason: string | null;
  requestedAt: string;
}

/**
 * Sends a GChat alert when a customer requests a handoff.
 * Intended to run inside Next.js `after()` from the handoff request path.
 */
export async function sendHandoffRequestedGChatAlert(
  params: HandoffRequestedGChatAlertParams
): Promise<void> {
  const webhookUrl = process.env.GOOGLE_CHAT_WEBHOOK_URL?.trim() ?? null;
  if (!webhookUrl) {
    console.warn(
      "GOOGLE_CHAT_WEBHOOK_URL is not configured; handoff GChat alerts are disabled."
    );
    return;
  }

  try {
    const result = await sendGChatHandoffRequestedAlert({
      requestId: params.requestId,
      conversationId: params.conversationId,
      reason: params.reason,
      webhookUrl,
    });

    if (!result.ok) {
      console.error("GChat webhook returned non-OK status", {
        requestId: params.requestId,
        status: result.status,
      });
      return;
    }

    const supabase = getSupabaseServiceRoleClient();
    const { error: updateError } = await supabase
      .schema("ava")
      .from("handoff_requests")
      .update({ gchat_alerted_at: new Date().toISOString() })
      .eq("id", params.requestId)
      .is("gchat_alerted_at", null);

    if (updateError) {
      console.error("Failed to stamp gchat_alerted_at", {
        requestId: params.requestId,
        error: updateError.message,
      });
    }
  } catch (err) {
    console.error("Failed to send GChat handoff requested alert", {
      requestId: params.requestId,
      error: err,
    });
  }
}
