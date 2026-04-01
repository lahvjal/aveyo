import { type Ticket } from "@/lib/dashboard-types";
import { InitialChip } from "./initial-chip";

interface QueueColumnProps {
  isOnline: boolean;
  activeTicket: Ticket | null;
  pendingQueue: Ticket[];
  onToggleOnline: () => void;
  onResolveChat: () => void;
  onClaimChat: (ticketId: string) => void;
}

export function QueueColumn({
  isOnline,
  activeTicket,
  pendingQueue,
  onToggleOnline,
  onResolveChat,
  onClaimChat
}: QueueColumnProps) {
  return (
    <section className="queue-column">
      <div className="queue-head">
        <div className="status-block">
          <span className="online-dot" aria-hidden />
          <div>
            <p>Online</p>
            <small>{activeTicket ? "1" : "0"}/2 active chats</small>
          </div>
        </div>
        <button
          type="button"
          className={`offline-toggle ${isOnline ? "online" : "offline"}`}
          onClick={onToggleOnline}
        >
          <span aria-hidden>◉</span> {isOnline ? "Go Offline" : "Go Online"}
        </button>
      </div>

      <div className="queue-section-title">
        <strong>Active</strong>
        <span>({activeTicket ? 1 : 0})</span>
      </div>
      <div className="queue-cards">
        {activeTicket ? (
          <article className="queue-card">
            <div className="queue-identity">
              <InitialChip initials={activeTicket.initials} tone={activeTicket.chipTone} />
              <p>{activeTicket.email}</p>
            </div>
            <p className="queue-wait">{activeTicket.waitLabel}</p>
            <p className="queue-preview">{`"${activeTicket.preview}"`}</p>
            <button type="button" className="queue-action resolve" onClick={onResolveChat}>
              RESOLVE
            </button>
          </article>
        ) : (
          <p className="empty-state">No active chats.</p>
        )}
      </div>

      <div className="queue-section-title bordered">
        <strong>Pending Queue</strong>
        <span>({pendingQueue.length})</span>
      </div>
      <div className="queue-cards">
        {pendingQueue.length === 0 ? (
          <p className="empty-state">No pending requests.</p>
        ) : (
          pendingQueue.map((ticket) => (
            <article className="queue-card" key={ticket.id}>
              <div className="queue-identity">
                <InitialChip initials={ticket.initials} tone={ticket.chipTone} />
                <p>{ticket.email}</p>
              </div>
              <p className="queue-wait">{ticket.waitLabel}</p>
              <p className="queue-preview">{`"${ticket.preview}"`}</p>
              <button
                type="button"
                className="queue-action claim"
                onClick={() => onClaimChat(ticket.id)}
              >
                CLAIM CHAT
              </button>
            </article>
          ))
        )}
      </div>
    </section>
  );
}
