import { memo, useEffect, useRef } from "react";
import { type ConversationThread } from "@ava/chat-domain";
import { AvaOrb } from "@ava/ui";
import {
  getCustomerMessageSentimentLabel,
  getCustomerMessageSentimentLevel
} from "@/lib/customer-sentiment-ui";
import { type Ticket } from "@/lib/dashboard-types";
import { InitialChip } from "./initial-chip";

function getNameInitials(name: string | null | undefined, fallback: string) {
  const trimmed = typeof name === "string" ? name.trim() : "";
  if (!trimmed) {
    return fallback;
  }

  const parts = trimmed
    .split(" ")
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 2);
  if (parts.length === 0) {
    return fallback;
  }

  return parts.map((part) => part[0]?.toUpperCase() ?? "").join("");
}

interface ChatColumnProps {
  conversation: ConversationThread;
  activeTicket: Ticket | null;
  hasActiveChat: boolean;
  hasPendingChats: boolean;
  isOnline: boolean;
  isEmptyState: boolean;
  composerLocked?: boolean;
  composerLockedReason?: string;
  composeMode: "reply" | "note";
  composeValue: string;
  showAvaSuggestion?: boolean;
  avaSuggestionText?: string | null;
  avaSuggestionLoading?: boolean;
  avaSuggestionError?: string | null;
  showHeader?: boolean;
  agentInitials: string;
  agentAvatarUrl?: string | null;
  submitPending?: boolean;
  onComposeModeChange: (mode: "reply" | "note") => void;
  onComposeValueChange: (value: string) => void;
  onSubmitCompose: () => void;
  onUseAvaSuggestion?: () => void;
  onRefreshAvaSuggestion?: () => void;
}

export const ChatColumn = memo(function ChatColumn({
  conversation,
  activeTicket,
  hasActiveChat,
  hasPendingChats,
  isOnline,
  isEmptyState,
  composerLocked = false,
  composerLockedReason,
  composeMode,
  composeValue,
  showAvaSuggestion = false,
  avaSuggestionText,
  avaSuggestionLoading = false,
  avaSuggestionError,
  showHeader = true,
  agentInitials,
  agentAvatarUrl,
  submitPending = false,
  onComposeModeChange,
  onComposeValueChange,
  onSubmitCompose,
  onUseAvaSuggestion,
  onRefreshAvaSuggestion
}: ChatColumnProps) {
  const timelineRef = useRef<HTMLDivElement | null>(null);
  const isNoteMode = composeMode === "note";
  const composerDisabled = isEmptyState || composerLocked;
  const hasComposeText = composeValue.trim().length > 0;
  const submitDisabled = composerDisabled || submitPending || !hasComposeText;
  const emptyStateEyebrow = !isOnline
    ? "Offline mode"
    : hasPendingChats
      ? "Queue ready"
      : "Waiting for chats";
  const emptyStateTitle = !isOnline
    ? "Go online to start taking chats"
    : hasPendingChats
      ? "No conversation selected"
      : "No active conversation";
  const emptyStateDescription = !isOnline
    ? "Switch to online when you are ready to receive incoming requests."
    : hasPendingChats
      ? "Claim a pending request from the queue to start messaging."
      : "You are all caught up. New requests will appear in the pending queue.";
  const composeHelper = composerDisabled
    ? composerLocked && composerLockedReason
      ? composerLockedReason
      : !isOnline
        ? "You're offline. Go online to start new conversations."
        : hasActiveChat
          ? isNoteMode
            ? "Loading note composer..."
            : "Loading conversation..."
          : isNoteMode
            ? "Select a chat to add internal notes."
            : hasPendingChats
              ? "Claim a chat from the queue to unlock messaging."
              : "Messaging unlocks when a conversation becomes active."
    : isNoteMode
      ? submitPending
        ? "Saving note..."
        : "Press Enter to save note. Shift+Enter for a new line."
      : hasActiveChat
        ? submitPending
          ? "Sending message..."
          : "Press Enter to send. Shift+Enter for a new line."
        : "Select a conversation to send messages.";
  const showSuggestionCard = !composerDisabled && !isNoteMode && showAvaSuggestion;
  const composePlaceholder = composerDisabled
    ? composerLocked
      ? isNoteMode
        ? "Note-taking is unavailable for this handoff."
        : "Messaging is unavailable for this handoff."
      : hasActiveChat
        ? isNoteMode
          ? "Loading notes..."
          : "Loading conversation..."
        : isNoteMode
          ? "Select a chat to add internal notes."
          : "Claim a chat to send messages."
    : isNoteMode
      ? "Write a note..."
      : "Write your message here...";
  const submitAriaLabel = submitPending
    ? isNoteMode
      ? "Saving note"
      : "Sending message"
    : isNoteMode
      ? "Save note"
      : "Send message";

  useEffect(() => {
    if (isEmptyState || conversation.messages.length === 0) {
      return;
    }
    const timeline = timelineRef.current;
    if (!timeline) {
      return;
    }
    const frameId = window.requestAnimationFrame(() => {
      timeline.scrollTop = timeline.scrollHeight;
    });
    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [conversation.id, conversation.messages.length, isEmptyState]);

  return (
    <section className="chat-column">
      {showHeader ? (
        <header className="chat-topbar">
          <div className="chat-top-identity">
            <InitialChip initials={activeTicket?.initials ?? "CU"} tone="sand" size={40} />
            <strong>{activeTicket?.fullName ?? "No active chat"}</strong>
          </div>
          <strong>{isEmptyState ? "--:--" : "0:02"}</strong>
        </header>
      ) : null}

      {isEmptyState ? (
        <div className="chat-empty-state">
          <div className="chat-empty-card">
            <AvaOrb size={44} />
            <p className="chat-empty-eyebrow">{emptyStateEyebrow}</p>
            <strong>{emptyStateTitle}</strong>
            <p>{emptyStateDescription}</p>
            <div className="chat-empty-meta">
              <span className={`chat-empty-pill ${isOnline ? "online" : "offline"}`}>
                {isOnline ? "Online" : "Offline"}
              </span>
              <span className={`chat-empty-pill ${hasPendingChats ? "pending" : "idle"}`}>
                {hasPendingChats ? "Pending requests available" : "No pending requests"}
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="chat-timeline" ref={timelineRef}>
          {conversation.messages.map((message) => {
            if (message.kind === "system") {
              return (
                <div className="timeline-row system" key={message.id}>
                  <span>✓</span>
                  <strong>{message.text}</strong>
                </div>
              );
            }

            if (message.kind === "representative") {
              const representativeAvatarUrl =
                message.representative?.avatarUrl?.trim() || agentAvatarUrl || undefined;
              const representativeInitials = getNameInitials(
                message.representative?.name,
                agentInitials
              );
              return (
                <div className="timeline-row right" key={message.id}>
                  <p className="msg-bubble rep">{message.text}</p>
                  <InitialChip
                    initials={representativeInitials}
                    avatarUrl={representativeAvatarUrl}
                    tone="sand"
                    size={25}
                  />
                </div>
              );
            }

            const isCustomer = message.kind === "customer";
            const customerSentimentLevel = getCustomerMessageSentimentLevel(message);
            return (
              <div className="timeline-row left" key={message.id}>
                {isCustomer ? (
                  <InitialChip initials={activeTicket?.initials ?? "CU"} tone="sand" size={25} />
                ) : (
                  <AvaOrb size={25} />
                )}
                <p className={`msg-bubble ${isCustomer ? "customer" : "ava"}`}>{message.text}</p>
                {isCustomer && customerSentimentLevel ? (
                  <span
                    className={`customer-sentiment-dot ${customerSentimentLevel}`}
                    title={getCustomerMessageSentimentLabel(customerSentimentLevel)}
                    aria-label={getCustomerMessageSentimentLabel(customerSentimentLevel)}
                  />
                ) : null}
              </div>
            );
          })}
        </div>
      )}

      <div className={`chat-note-compose${composerDisabled ? " is-disabled" : ""}`}>
        {showSuggestionCard ? (
          <div className="chat-ava-suggestion" aria-live="polite">
            <div className="chat-ava-suggestion-header">
              <AvaOrb size={16} />
              <strong>Ava suggested reply</strong>
            </div>

            {avaSuggestionLoading ? (
              <p className="chat-ava-suggestion-state">Drafting a response using project data...</p>
            ) : avaSuggestionError ? (
              <p className="chat-ava-suggestion-error">{avaSuggestionError}</p>
            ) : avaSuggestionText ? (
              <p className="chat-ava-suggestion-body">{avaSuggestionText}</p>
            ) : (
              <p className="chat-ava-suggestion-state">No draft available yet for this question.</p>
            )}

            <div className="chat-ava-suggestion-actions">
              <button
                type="button"
                className="chat-ava-suggestion-action secondary"
                onClick={onRefreshAvaSuggestion}
                disabled={avaSuggestionLoading}
              >
                Refresh
              </button>
              <button
                type="button"
                className="chat-ava-suggestion-action primary"
                onClick={onUseAvaSuggestion}
                disabled={avaSuggestionLoading || !avaSuggestionText}
              >
                Use draft
              </button>
            </div>
          </div>
        ) : null}

        <div className="chat-compose-tabs" role="group" aria-label="Composer mode">
          <button
            type="button"
            className={composeMode === "reply" ? "is-active" : ""}
            aria-pressed={composeMode === "reply"}
            onClick={() => onComposeModeChange("reply")}
          >
            Reply
          </button>
          <button
            type="button"
            className={composeMode === "note" ? "is-active" : ""}
            aria-pressed={composeMode === "note"}
            onClick={() => onComposeModeChange("note")}
          >
            Note
          </button>
        </div>

        <textarea
          value={composeValue}
          disabled={composerDisabled}
          onChange={(event) => onComposeValueChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              if (!submitDisabled) {
                onSubmitCompose();
              }
            }
          }}
          placeholder={composePlaceholder}
        />
        <div className="chat-compose-footer">
          <span className="chat-compose-attachment" aria-hidden="true">
            +
          </span>
          <button
            type="button"
            className={`chat-send-button${submitPending ? " is-loading" : ""}`}
            onClick={onSubmitCompose}
            aria-label={submitAriaLabel}
            disabled={submitDisabled}
          >
            {submitPending ? <span className="inline-button-spinner" aria-hidden="true" /> : "↑"}
          </button>
        </div>
        <p className="compose-helper">{composeHelper}</p>
      </div>
    </section>
  );
});
