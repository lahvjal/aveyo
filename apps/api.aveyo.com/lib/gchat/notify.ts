export interface GChatNotifyResult {
  ok: boolean;
  status: number;
}

function formatCustomerLine(customerName: string, customerEmail: string | null): string {
  const name = customerName.trim() || "Unknown";
  const email = customerEmail?.trim() || "Unknown";
  return `*Customer:* ${name} (${email})`;
}

function formatReasonLine(reason: string | null): string {
  const value = reason?.trim();
  return `*Reason:* ${value || "Not provided"}`;
}

export async function sendGChatHandoffRequestedAlert(params: {
  requestId: string;
  conversationId: string;
  customerName: string;
  customerEmail: string | null;
  reason: string | null;
  webhookUrl: string;
}): Promise<GChatNotifyResult> {
  const { requestId, conversationId, customerName, customerEmail, reason, webhookUrl } = params;

  const text = [
    "🔔 *New customer handoff requested.*",
    formatCustomerLine(customerName, customerEmail),
    formatReasonLine(reason),
    `*Conversation:* \`${conversationId}\``,
    `*Request ID:* \`${requestId}\``,
  ].join("\n");

  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });

  return { ok: response.ok, status: response.status };
}
