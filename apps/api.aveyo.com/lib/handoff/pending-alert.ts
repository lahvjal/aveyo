import { getSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { sendGChatHandoffRequestedAlert } from "@/lib/gchat/notify";

export interface HandoffRequestedGChatAlertParams {
  requestId: string;
  conversationId: string;
  customerName: string;
  customerEmail: string | null;
  reason: string | null;
}

function asTrimmedString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/** Best-effort customer email for GChat handoff alerts. */
export async function resolveCustomerEmailForHandoffAlert(
  authUserId: string
): Promise<string | null> {
  const supabase = getSupabaseServiceRoleClient();

  const { data: customerProfile } = await supabase
    .schema("ava")
    .from("customer_profiles")
    .select("email")
    .eq("auth_user_id", authUserId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const profileEmail = asTrimmedString(
    (customerProfile as { email?: string | null } | null)?.email
  );
  if (profileEmail) {
    return profileEmail;
  }

  const { data: platformProfile } = await supabase
    .from("profiles")
    .select("email")
    .eq("id", authUserId)
    .maybeSingle();

  const platformEmail = asTrimmedString(
    (platformProfile as { email?: string | null } | null)?.email
  );
  if (platformEmail) {
    return platformEmail;
  }

  try {
    const { data, error } = await supabase.auth.admin.getUserById(authUserId);
    if (!error && data.user) {
      return asTrimmedString(data.user.email);
    }
  } catch {
    // Best-effort only.
  }

  return null;
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
      customerName: params.customerName,
      customerEmail: params.customerEmail,
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
