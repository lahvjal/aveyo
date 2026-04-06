import { type ConversationThread } from "@ava/chat-domain";
import { AvaOrb } from "@ava/ui";
import { type Ticket } from "@/lib/dashboard-types";
import { InitialChip } from "./initial-chip";

interface ChatColumnProps {
  conversation: ConversationThread;
  activeTicket: Ticket | null;
  hasActiveChat: boolean;
  hasPendingChats: boolean;
  isOnline: boolean;
  isEmptyState: boolean;
  composerLocked?: boolean;
  composerLockedReason?: string;
  composeNote: string;
  showAvaSuggestion?: boolean;
  avaSuggestionText?: string | null;
  avaSuggestionLoading?: boolean;
  avaSuggestionError?: string | null;
  agentInitials: string;
  agentAvatarUrl?: string | null;
  onComposeNoteChange: (value: string) => void;
  onSendMessage: () => void;
  onUseAvaSuggestion?: () => void;
  onRefreshAvaSuggestion?: () => void;
}

export function ChatColumn({
  conversation,
  activeTicket,
  hasActiveChat,
  hasPendingChats,
  isOnline,
  isEmptyState,
  composerLocked = false,
  composerLockedReason,
  composeNote,
  showAvaSuggestion = false,
  avaSuggestionText,
  avaSuggestionLoading = false,
  avaSuggestionError,
  agentInitials,
  agentAvatarUrl,
  onComposeNoteChange,
  onSendMessage,
  onUseAvaSuggestion,
  onRefreshAvaSuggestion
}: ChatColumnProps) {
  const composerDisabled = isEmptyState || composerLocked;
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
      : hasPendingChats
        ? "Claim a chat from the queue to unlock messaging."
        : "Messaging unlocks when a conversation becomes active."
    : hasActiveChat
      ? "Press Enter to send. Shift+Enter for a new line."
      : "Select a conversation to send messages.";
  const showSuggestionCard = !composerDisabled && showAvaSuggestion;

  return (
    <section className="chat-column">
      <header className="chat-topbar">
        <div className="chat-top-identity">
          <InitialChip initials={activeTicket?.initials ?? "CU"} tone="sand" size={40} />
          <strong>{activeTicket?.fullName ?? "No active chat"}</strong>
        </div>
        <strong>{isEmptyState ? "--:--" : "0:02"}</strong>
      </header>

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
        <div className="chat-timeline">
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
              return (
                <div className="timeline-row right" key={message.id}>
                  <p className="msg-bubble rep">{message.text}</p>
                  <InitialChip
                    initials={agentInitials}
                    avatarUrl={agentAvatarUrl}
                    tone="sand"
                    size={25}
                  />
                </div>
              );
            }

            const isCustomer = message.kind === "customer";
            return (
              <div className="timeline-row left" key={message.id}>
                {isCustomer ? <InitialChip initials="JD" tone="sand" size={25} /> : <AvaOrb size={25} />}
                <p className={`msg-bubble ${isCustomer ? "customer" : "ava"}`}>{message.text}</p>
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

        <textarea
          value={composeNote}
          disabled={composerDisabled}
          onChange={(event) => onComposeNoteChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              onSendMessage();
            }
          }}
          placeholder={
            composerDisabled
              ? composerLocked
                ? "Messaging is unavailable for this handoff."
                : "Claim a chat to send messages."
              : "Message"
          }
        />
        <button
          type="button"
          className="chat-send-button"
          onClick={onSendMessage}
          aria-label="Send message"
          disabled={composerDisabled}
        >
          ↑
        </button>
        <p className="compose-helper">{composeHelper}</p>
      </div>
    </section>
  );
}
