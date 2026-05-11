export interface GChatNotifyResult {
  ok: boolean;
  status: number;
}

function formatDuration(requestedAt: string): string {
  const ms = Date.now() - new Date(requestedAt).getTime();
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
}

export async function sendGChatPendingHandoffAlert(params: {
  requestId: string;
  conversationId: string;
  reason: string | null;
  requestedAt: string;
  webhookUrl: string;
}): Promise<GChatNotifyResult> {
  const { requestId, conversationId, reason, requestedAt, webhookUrl } = params;

  const duration = formatDuration(requestedAt);
  const reasonLine = reason ? `\n*Reason:* ${reason}` : "";

  const text = [
    `🔔 *Customer chat has been waiting for ${duration} with no rep claimed it.*`,
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
