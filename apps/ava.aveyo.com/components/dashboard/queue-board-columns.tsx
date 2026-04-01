import { type Ticket } from "@/lib/dashboard-types";
import { InitialChip } from "./initial-chip";

interface QueueBoardColumnsProps {
  pendingQueue: Ticket[];
  activeQueue: Ticket[];
  resolvedTodayQueue: Ticket[];
  onClaimChat: (ticketId: string) => void;
  onOpenChat: (ticketId: string) => void;
}

function QueueLaneCard(props: {
  ticket: Ticket;
  lane: "pending" | "active" | "resolved";
  onClaimChat: (ticketId: string) => void;
  onOpenChat: (ticketId: string) => void;
}) {
  const { ticket, lane, onClaimChat, onOpenChat } = props;
  const secondaryLine =
    ticket.email.trim() && ticket.email.trim() !== ticket.fullName.trim() ? ticket.email : null;

  return (
    <article className={`board-queue-card ${lane}`}>
      <div className="board-queue-identity">
        <InitialChip initials={ticket.initials} tone={ticket.chipTone} />
        <div>
          <strong>{ticket.fullName}</strong>
          {secondaryLine ? <p>{secondaryLine}</p> : null}
        </div>
      </div>
      <p className="board-queue-wait">{ticket.waitLabel}</p>
      {ticket.lapsedLabel ? <p className="board-queue-lapsed">{ticket.lapsedLabel}</p> : null}
      <p className="board-queue-preview">{`"${ticket.preview}"`}</p>
      {lane === "pending" ? (
        <button
          type="button"
          className="board-queue-action claim"
          onClick={() => onClaimChat(ticket.id)}
        >
          Claim Chat
        </button>
      ) : (
        <button type="button" className="board-queue-action open" onClick={() => onOpenChat(ticket.id)}>
          {lane === "resolved" ? "Open Transcript" : "Open Chat"}
        </button>
      )}
    </article>
  );
}

function QueueLane(props: {
  title: string;
  count: number;
  lane: "pending" | "active" | "resolved";
  emptyCopy: string;
  tickets: Ticket[];
  onClaimChat: (ticketId: string) => void;
  onOpenChat: (ticketId: string) => void;
}) {
  const { title, count, lane, emptyCopy, tickets, onClaimChat, onOpenChat } = props;
  return (
    <section className={`board-lane ${lane}`}>
      <header className="board-lane-head">
        <strong>{title}</strong>
        <span className="board-lane-count">{count}</span>
      </header>
      <div className="board-lane-body">
        {tickets.length === 0 ? (
          <p className="empty-state">{emptyCopy}</p>
        ) : (
          tickets.map((ticket) => (
            <QueueLaneCard
              key={ticket.id}
              ticket={ticket}
              lane={lane}
              onClaimChat={onClaimChat}
              onOpenChat={onOpenChat}
            />
          ))
        )}
      </div>
    </section>
  );
}

export function QueueBoardColumns({
  pendingQueue,
  activeQueue,
  resolvedTodayQueue,
  onClaimChat,
  onOpenChat
}: QueueBoardColumnsProps) {
  return (
    <div className="board-columns">
      <QueueLane
        title="Pending Queue"
        count={pendingQueue.length}
        lane="pending"
        tickets={pendingQueue}
        emptyCopy="No pending requests."
        onClaimChat={onClaimChat}
        onOpenChat={onOpenChat}
      />
      <QueueLane
        title="Active"
        count={activeQueue.length}
        lane="active"
        tickets={activeQueue}
        emptyCopy="No active chats."
        onClaimChat={onClaimChat}
        onOpenChat={onOpenChat}
      />
      <QueueLane
        title="Resolved Today"
        count={resolvedTodayQueue.length}
        lane="resolved"
        tickets={resolvedTodayQueue}
        emptyCopy="No chats resolved today."
        onClaimChat={onClaimChat}
        onOpenChat={onOpenChat}
      />
    </div>
  );
}
