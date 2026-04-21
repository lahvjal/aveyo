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

function toDurationLabel(totalSeconds: number) {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainderSeconds = seconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m ${remainderSeconds}s`;
  }
  if (minutes > 0) {
    return `${minutes}m ${remainderSeconds}s`;
  }
  return `${remainderSeconds}s`;
}

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

function toElapsedSeconds(startMs: number, endMs: number) {
  return Math.max(0, Math.floor((endMs - startMs) / 1000));
}

function toTimerLabels(record: QueueRecord, nowMs: number) {
  const requestedAtMs = parseIsoToMs(record.requestedAt) ?? nowMs;
  const claimedAtMs = parseIsoToMs(record.claimedAt);
  const resolvedAtMs = parseIsoToMs(record.resolvedAt);

  const waitedSeconds = (() => {
    if (record.status === "pending") {
      return toElapsedSeconds(requestedAtMs, nowMs);
    }
    if (claimedAtMs !== null) {
      return toElapsedSeconds(requestedAtMs, claimedAtMs);
    }
    return Math.max(0, Math.floor(record.elapsedWaitSeconds));
  })();

  const waitPrefix = record.status === "pending" ? "Waiting" : "Waited";
  const waitLabel = `${waitPrefix}: ${toDurationLabel(waitedSeconds)}`;

  if (claimedAtMs === null || record.status === "pending") {
    return { waitLabel, waitSeconds: waitedSeconds, lapsedLabel: undefined };
  }

  const lapsedEndMs = record.status === "resolved" ? (resolvedAtMs ?? claimedAtMs) : nowMs;
  const lapsedSeconds = toElapsedSeconds(claimedAtMs, lapsedEndMs);
  return {
    waitLabel,
    waitSeconds: waitedSeconds,
    lapsedLabel: `Time lapsed: ${toDurationLabel(lapsedSeconds)}`
  };
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
  conversation?: ConversationThread,
  nowMs: number = Date.now()
): Ticket {
  const fullName = record.customerName || "Customer";
  const impersonationByName = record.impersonationByName?.trim();
  const detailLine = impersonationByName ? `Impersonation by ${impersonationByName}` : fullName;
  const { waitLabel, waitSeconds, lapsedLabel } = toTimerLabels(record, nowMs);

  return {
    id: record.requestId,
    conversationId: record.conversationId,
    status: record.status,
    fullName,
    email: detailLine,
    initials: toInitials(fullName),
    waitLabel,
    waitSeconds,
    lapsedLabel,
    preview: record.reason?.trim() || latestMessagePreview(conversation),
    chipTone: record.status === "pending" ? "blue" : "sand",
    requestedAt: record.requestedAt,
    claimedAt: record.claimedAt,
    elapsedWaitSeconds: record.elapsedWaitSeconds,
    claimedByAuthUserId: record.claimedByAuthUserId,
    resolvedAt: record.resolvedAt,
    resolvedByAuthUserId: record.resolvedByAuthUserId,
    representative: record.representative
      ? {
          id: record.representative.id,
          name: record.representative.name,
          avatarUrl: record.representative.avatarUrl
        }
      : undefined,
    customerRating: record.customerRating,
    transferRequest: record.transferRequest
      ? {
          id: record.transferRequest.id,
          requestedAt: record.transferRequest.requestedAt,
          note: record.transferRequest.note,
          requestedBy: record.transferRequest.requestedBy,
          target: record.transferRequest.target
        }
      : undefined
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
