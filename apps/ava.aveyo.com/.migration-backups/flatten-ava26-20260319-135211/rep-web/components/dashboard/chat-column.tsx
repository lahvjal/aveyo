import { type ConversationThread } from "@ava/chat-domain";
import { AvaOrb } from "@ava/ui";
import { type Ticket } from "@/lib/dashboard-types";
import { InitialChip } from "./initial-chip";

interface ChatColumnProps {
  conversation: ConversationThread;
  activeTicket: Ticket | null;
  isEmptyState: boolean;
  composeNote: string;
  agentInitials: string;
  agentAvatarUrl?: string | null;
  onComposeNoteChange: (value: string) => void;
  onSendMessage: () => void;
}

export function ChatColumn({
  conversation,
  activeTicket,
  isEmptyState,
  composeNote,
  agentInitials,
  agentAvatarUrl,
  onComposeNoteChange,
  onSendMessage
}: ChatColumnProps) {
  const composerDisabled = isEmptyState;

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
          <AvaOrb size={40} />
          <strong>No conversation selected</strong>
          <p>Claim a chat from the queue to start messaging.</p>
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

      <div className="chat-note-compose">
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
          placeholder={composerDisabled ? "Claim a chat to send messages." : "Message"}
        />
        <button
          type="button"
          onClick={onSendMessage}
          aria-label="Send message"
          disabled={composerDisabled}
        >
          ↑
        </button>
      </div>
    </section>
  );
}
