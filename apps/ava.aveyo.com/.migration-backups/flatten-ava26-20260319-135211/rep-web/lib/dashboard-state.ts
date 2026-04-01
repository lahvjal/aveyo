import { type ConversationThread, type TimelineMessage } from "@ava/chat-domain";
import {
  type ConversationCustomerDetails,
  type QueueRecord,
  type SupportAgentNote
} from "./dashboard-api";
import { type CustomerPanelDetails, type HistoryNote, type Ticket } from "./dashboard-types";

function toInitials(name: string) {
  const parts = name
    .split(" ")
    .map((value) => value.trim())
    .filter(Boolean)
    .slice(0, 2);

  if (parts.length === 0) {
    return "CU";
  }
  return parts.map((part) => part[0]?.toUpperCase() ?? "").join("");
}

function toWaitLabel(record: QueueRecord): string {
  const seconds = Math.max(0, Math.floor(record.elapsedWaitSeconds));
  const prefix = record.status === "pending" ? "Waiting" : "Waited";
  return `${prefix}: ${seconds}s`;
}

export function createEmptyConversation(): ConversationThread {
  const createdAt = new Date().toISOString();
  return {
    id: "no-conversation",
    authenticated: true,
    messages: [
      {
        id: "no-conversation-msg",
        conversationId: "no-conversation",
        kind: "ava",
        text: "No active chat selected.",
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

export function normalizeDraft(value: string): string | undefined {
  const body = value.trim();
  return body ? body : undefined;
}

export function appendTimelineMessage(
  conversation: ConversationThread,
  message: TimelineMessage
): ConversationThread {
  return {
    ...conversation,
    messages: [...conversation.messages, message],
    updatedAt: message.createdAt
  };
}

export function latestMessagePreview(conversation: ConversationThread | undefined) {
  if (!conversation || conversation.messages.length === 0) {
    return "No messages yet.";
  }

  const latest = conversation.messages[conversation.messages.length - 1];
  return latest?.text || "No messages yet.";
}

export function createTicketFromQueueRecord(
  record: QueueRecord,
  conversation?: ConversationThread
): Ticket {
  const fullName = record.customerName || "Customer";

  return {
    id: record.requestId,
    fullName,
    email: fullName,
    initials: toInitials(fullName),
    waitLabel: toWaitLabel(record),
    preview: record.reason?.trim() || latestMessagePreview(conversation),
    chipTone: record.status === "pending" ? "blue" : "sand"
  };
}

function formatNoteTimestamp(value: string) {
  const timestamp = new Date(value);
  if (Number.isNaN(timestamp.getTime())) {
    return "Now";
  }

  const elapsedSeconds = Math.floor((Date.now() - timestamp.getTime()) / 1000);
  if (elapsedSeconds < 60) {
    return "Now";
  }
  if (elapsedSeconds < 3600) {
    return `${Math.floor(elapsedSeconds / 60)}m ago`;
  }
  if (elapsedSeconds < 86400) {
    return `${Math.floor(elapsedSeconds / 3600)}h ago`;
  }
  return `${Math.floor(elapsedSeconds / 86400)}d ago`;
}

export function mapSupportAgentNoteToHistoryNote(note: SupportAgentNote): HistoryNote {
  return {
    id: note.id,
    author: note.author.name || "Support Agent",
    timestamp: formatNoteTimestamp(note.createdAt),
    body: note.body
  };
}

export function mapConversationCustomerDetailsToPanelData(
  details: ConversationCustomerDetails
): CustomerPanelDetails {
  return {
    customerId: details.customer.customerId ?? details.customer.authUserId,
    email: details.customer.email ?? "N/A",
    phone: details.customer.phone ?? "N/A",
    address: details.customer.address ?? details.project.siteAddress ?? "N/A",
    fin: details.customer.fin ?? "N/A",
    projectRef: details.project.projectRef ?? "N/A",
    projectStatus: details.project.projectStatus ?? "N/A"
  };
}
