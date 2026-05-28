export interface GChatNotifyResult {
  ok: boolean;
  status: number;
}

export async function sendGChatHandoffRequestedAlert(params: {
  requestId: string;
  conversationId: string;
  reason: string | null;
  webhookUrl: string;
}): Promise<GChatNotifyResult> {
  const { requestId, conversationId, reason, webhookUrl } = params;

  const reasonLine = reason ? `\n*Reason:* ${reason}` : "";

  const text = [
    "🔔 *New customer handoff requested.*",
    `*Conversation:* \`${conversationId}\``,
    `*Request ID:* \`${requestId}\``,
    reasonLine,
  ]
    .filter(Boolean)
    .join("\n");

  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });

  return { ok: response.ok, status: response.status };
}
