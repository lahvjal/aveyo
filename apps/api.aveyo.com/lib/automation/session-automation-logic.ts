export const SESSION_IDLE_PROMPT_AFTER_MS = 60_000;
export const SESSION_IDLE_CLOSE_AFTER_PROMPT_MS = 60_000;
export const SESSION_IDLE_FORCE_CLOSE_AFTER_MS = 60 * 60 * 1000;
export const SESSION_IDLE_AUTOMATION_SOURCE = "session_idle_automation_v1";
export const SESSION_IDLE_PROMPT_MESSAGE =
  "Are you still there? If I don't hear from you, I'll close this conversation.";
export const SESSION_IDLE_CLOSE_MESSAGE =
  "You didn't respond, so I will be closing this conversation.";
export const RESOLVED_SESSION_AUTO_CLOSE_AFTER_MS = 30 * 60 * 1000;
export const RESOLVED_SESSION_CLOSE_MESSAGE = "This handoff has been resolved, so I am closing this chat.";

export type SessionAutomationSenderKind = "customer" | "ava" | "support_agent" | "system";
export type SessionIdleAutomationKind = "idle_prompt" | "idle_close";

export interface SessionAutomationMessageLike {
  senderKind: SessionAutomationSenderKind;
  createdAt: string;
  payload?: Record<string, unknown> | null;
}

export type IdleAutomationDecision =
  | {
      action: "none";
    }
  | {
      action: "prompt";
      customerMessageAt: string;
    }
  | {
      action: "close";
      customerMessageAt: string;
      promptAt: string | null;
    };

function parseIsoToMs(value: string | null | undefined) {
  if (!value) {
    return null;
  }
  const parsed = new Date(value).getTime();
  if (Number.isNaN(parsed)) {
    return null;
  }
  return parsed;
}

function isAutomationMessage(message: SessionAutomationMessageLike) {
  return readSessionAutomationKind(message.payload) !== null;
}

function isParticipantActivityMessage(message: SessionAutomationMessageLike) {
  if (isAutomationMessage(message)) {
    return false;
  }
  return (
    message.senderKind === "customer" ||
    message.senderKind === "ava" ||
    message.senderKind === "support_agent"
  );
}

export function readSessionAutomationKind(
  payload: Record<string, unknown> | null | undefined
): SessionIdleAutomationKind | null {
  const automationValue = payload?.automation;
  if (!automationValue || typeof automationValue !== "object") {
    return null;
  }

  const automation = automationValue as Record<string, unknown>;
  const source = typeof automation.source === "string" ? automation.source : "";
  const kind = typeof automation.kind === "string" ? automation.kind : "";
  if (source !== SESSION_IDLE_AUTOMATION_SOURCE) {
    return null;
  }
  if (kind === "idle_prompt" || kind === "idle_close") {
    return kind;
  }
  return null;
}

export function getIdleAutomationDecision(
  messages: SessionAutomationMessageLike[],
  nowMs: number = Date.now()
): IdleAutomationDecision {
  let lastParticipantActivity: SessionAutomationMessageLike | null = null;
  let lastParticipantActivityMs: number | null = null;

  for (const message of messages) {
    if (!isParticipantActivityMessage(message)) {
      continue;
    }
    const messageMs = parseIsoToMs(message.createdAt);
    if (messageMs === null) {
      continue;
    }
    if (lastParticipantActivityMs === null || messageMs > lastParticipantActivityMs) {
      lastParticipantActivity = message;
      lastParticipantActivityMs = messageMs;
    }
  }

  if (!lastParticipantActivity || lastParticipantActivityMs === null) {
    return { action: "none" };
  }

  if (nowMs - lastParticipantActivityMs >= SESSION_IDLE_FORCE_CLOSE_AFTER_MS) {
    return {
      action: "close",
      customerMessageAt: lastParticipantActivity.createdAt,
      promptAt: null
    };
  }

  let latestPrompt: SessionAutomationMessageLike | null = null;
  let latestPromptMs: number | null = null;

  for (const message of messages) {
    if (readSessionAutomationKind(message.payload) !== "idle_prompt") {
      continue;
    }
    const messageMs = parseIsoToMs(message.createdAt);
    if (messageMs === null || messageMs <= lastParticipantActivityMs) {
      continue;
    }
    if (latestPromptMs === null || messageMs > latestPromptMs) {
      latestPrompt = message;
      latestPromptMs = messageMs;
    }
  }

  if (!latestPrompt || latestPromptMs === null) {
    if (nowMs - lastParticipantActivityMs < SESSION_IDLE_PROMPT_AFTER_MS) {
      return { action: "none" };
    }
    return {
      action: "prompt",
      customerMessageAt: lastParticipantActivity.createdAt
    };
  }

  for (const message of messages) {
    if (!isParticipantActivityMessage(message)) {
      continue;
    }
    const messageMs = parseIsoToMs(message.createdAt);
    if (messageMs !== null && messageMs > latestPromptMs) {
      return { action: "none" };
    }
  }

  if (nowMs - latestPromptMs < SESSION_IDLE_CLOSE_AFTER_PROMPT_MS) {
    return { action: "none" };
  }

  for (const message of messages) {
    if (readSessionAutomationKind(message.payload) !== "idle_close") {
      continue;
    }
    const messageMs = parseIsoToMs(message.createdAt);
    if (messageMs !== null && messageMs > latestPromptMs) {
      return { action: "none" };
    }
  }

  return {
    action: "close",
    customerMessageAt: lastParticipantActivity.createdAt,
    promptAt: latestPrompt.createdAt
  };
}

export function shouldAutoCloseResolvedConversation(
  lastActivityAt: string | null | undefined,
  nowMs: number = Date.now()
) {
  const lastActivityMs = parseIsoToMs(lastActivityAt);
  if (lastActivityMs === null) {
    return false;
  }
  return nowMs - lastActivityMs >= RESOLVED_SESSION_AUTO_CLOSE_AFTER_MS;
}
