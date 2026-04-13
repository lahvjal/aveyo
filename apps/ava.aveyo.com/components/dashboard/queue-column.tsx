import { type Ticket } from "@/lib/dashboard-types";
import { InitialChip } from "./initial-chip";

interface QueueColumnProps {
  isOnline: boolean;
  onlineStatusPending?: boolean;
  activeTicket: Ticket | null;
  pendingQueue: Ticket[];
  onToggleOnline: () => void;
  onResolveChat: () => void;
  onClaimChat: (ticketId: string) => void;
}

export function QueueColumn({
  isOnline,
  onlineStatusPending = false,
  activeTicket,
  pendingQueue,
  onToggleOnline,
  onResolveChat,
  onClaimChat
}: QueueColumnProps) {
  const activeCount = activeTicket ? 1 : 0;
  const pendingCount = pendingQueue.length;
  const getSecondaryLine = (ticket: Ticket) => {
    const detail = ticket.email.trim();
    return detail && detail !== ticket.fullName.trim() ? detail : null;
  };

  return (
    <section className="queue-column">
      <div className="queue-head">
        <div className="status-block">
          <span className={`online-dot ${isOnline ? "is-online" : "is-offline"}`} aria-hidden />
          <div>
            <p>{isOnline ? "Online" : "Offline"}</p>
            <small>{isOnline ? `${activeCount}/2 active chats` : "Queue monitoring paused"}</small>
          </div>
        </div>
        <button
          type="button"
          className={`offline-toggle ${isOnline ? "online" : "offline"}`}
          onClick={onToggleOnline}
          aria-pressed={isOnline}
          disabled={onlineStatusPending}
        >
          <span aria-hidden>{onlineStatusPending ? "..." : "◉"}</span>{" "}
          {onlineStatusPending ? "Updating..." : isOnline ? "Go Offline" : "Go Online"}
        </button>
      </div>

      <div className="queue-section-title">
        <strong className="queue-section-title-label">Active</strong>
        <span className="queue-count-badge">{activeCount}</span>
      </div>
      <div className="queue-cards">
        {activeTicket ? (
          <article className="queue-card">
            <div className="queue-identity">
              <InitialChip initials={activeTicket.initials} tone={activeTicket.chipTone} />
              <p>{activeTicket.fullName}</p>
            </div>
            {getSecondaryLine(activeTicket) ? <p>{getSecondaryLine(activeTicket)}</p> : null}
            <p className="queue-wait">{activeTicket.waitLabel}</p>
            {activeTicket.lapsedLabel ? <p className="queue-lapsed">{activeTicket.lapsedLabel}</p> : null}
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
        <strong className="queue-section-title-label">Pending Queue</strong>
        <span className="queue-count-badge">{pendingCount}</span>
      </div>
      <div className="queue-cards">
        {pendingCount === 0 ? (
          <p className="empty-state">
            {isOnline ? "No pending requests." : "Go online to receive new requests."}
          </p>
        ) : (
          pendingQueue.map((ticket) => (
            <article className="queue-card" key={ticket.id}>
              <div className="queue-identity">
                <InitialChip initials={ticket.initials} tone={ticket.chipTone} />
                <p>{ticket.fullName}</p>
              </div>
              {getSecondaryLine(ticket) ? <p>{getSecondaryLine(ticket)}</p> : null}
              <p className="queue-wait">{ticket.waitLabel}</p>
              {ticket.lapsedLabel ? <p className="queue-lapsed">{ticket.lapsedLabel}</p> : null}
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
