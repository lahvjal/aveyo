import { type ConversationThread, type TimelineMessage } from "@ava/chat-domain";

function buildAvaSystemThread(
  id: string,
  text: string,
  authenticated = true
): ConversationThread {
  const createdAt = new Date().toISOString();
  return {
    id,
    authenticated,
    messages: [
      {
        id: `ava-${id}`,
        conversationId: id,
        kind: "ava",
        text,
        createdAt,
        deliveryState: "sent"
      }
    ],
    handoff: {
      state: "none"
    },
    updatedAt: createdAt
  };
}

export function createStarterConversation(): ConversationThread {
  return buildAvaSystemThread("pending-conversation", "Loading conversation...");
}

export function createOptimisticCustomerGreetingConversation(
  customerName: string | null | undefined
): ConversationThread {
  const name = typeof customerName === "string" ? customerName.trim() : "";
  return buildAvaSystemThread(
    "optimistic-conversation",
    name ? `Hi, ${name}! How can I help you today?` : "Hi! How can I help you today?"
  );
}

export function createLoggedOutConversation(): ConversationThread {
  return buildAvaSystemThread(
    "logged-out-conversation",
    "You can ask Ava general questions about Aveyo services and solar. Sign in for project-specific answers.",
    false
  );
}

export function createTestModeConversation(
  customerName: string | null | undefined
): ConversationThread {
  const name = typeof customerName === "string" ? customerName.trim() : "";
  return buildAvaSystemThread(
    "test-mode-conversation",
    name
      ? `Hi, ${name}! I'm Ava from Aveyo. I'm here to help you with your solar installation questions!`
      : "Hi! I'm Ava from Aveyo. I'm here to help you with your solar installation questions!"
  );
}

export function normalizeMessageDraft(text: string): string | undefined {
  const value = text.trim();
  return value ? value : undefined;
}

export function appendMessage(thread: ConversationThread, message: TimelineMessage): ConversationThread {
  return {
    ...thread,
    messages: [...thread.messages, message],
    updatedAt: message.createdAt
  };
}

export function createSystemStatusMessage(
  conversationId: string,
  text: string,
  createdAt = new Date().toISOString()
): TimelineMessage {
  return {
    id: `system-${createdAt}-${Math.random().toString(36).slice(2, 8)}`,
    conversationId,
    kind: "system",
    text,
    createdAt,
    deliveryState: "sent",
    systemEvent: "queue_update"
  };
}
