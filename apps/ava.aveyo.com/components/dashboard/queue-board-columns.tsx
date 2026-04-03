import { type Ticket } from "@/lib/dashboard-types";
import { InitialChip } from "./initial-chip";

interface QueueBoardColumnsProps {
  pendingQueue: Ticket[];
  activeQueue: Ticket[];
  selectedActiveTicketId: string | null;
  onClaimChat: (ticketId: string) => void;
  onSelectActiveChat: (ticketId: string) => void;
  onSplitChat: (ticketId: string) => void;
}

function QueueLaneCard(props: {
  ticket: Ticket;
  lane: "pending" | "active";
  isSelected?: boolean;
  onClaimChat: (ticketId: string) => void;
  onSelectActiveChat: (ticketId: string) => void;
  onSplitChat: (ticketId: string) => void;
}) {
  const { ticket, lane, isSelected = false, onClaimChat, onSelectActiveChat, onSplitChat } = props;
  const secondaryLine =
    ticket.email.trim() && ticket.email.trim() !== ticket.fullName.trim() ? ticket.email : null;
  const interactiveCard = lane === "active";

  const selectCard = () => {
    if (!interactiveCard) {
      return;
    }
    onSelectActiveChat(ticket.id);
  };

  return (
    <article
      className={`board-queue-card ${lane}${interactiveCard && isSelected ? " is-selected" : ""}`}
      onClick={selectCard}
      onKeyDown={(event) => {
        if (!interactiveCard) {
          return;
        }
        if (event.key !== "Enter" && event.key !== " ") {
          return;
        }
        event.preventDefault();
        selectCard();
      }}
      role={interactiveCard ? "button" : undefined}
      tabIndex={interactiveCard ? 0 : undefined}
      aria-pressed={interactiveCard ? isSelected : undefined}
      aria-label={interactiveCard ? `Select active chat for ${ticket.fullName}` : undefined}
    >
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
        <button
          type="button"
          className="board-queue-action split"
          onClick={(event) => {
            event.stopPropagation();
            onSplitChat(ticket.id);
          }}
        >
          Split to tab
        </button>
      )}
    </article>
  );
}

function QueueLane(props: {
  title: string;
  count: number;
  lane: "pending" | "active";
  emptyCopy: string;
  tickets: Ticket[];
  selectedActiveTicketId: string | null;
  onClaimChat: (ticketId: string) => void;
  onSelectActiveChat: (ticketId: string) => void;
  onSplitChat: (ticketId: string) => void;
}) {
  const {
    title,
    count,
    lane,
    emptyCopy,
    tickets,
    selectedActiveTicketId,
    onClaimChat,
    onSelectActiveChat,
    onSplitChat
  } = props;
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
              isSelected={lane === "active" && selectedActiveTicketId === ticket.id}
              onClaimChat={onClaimChat}
              onSelectActiveChat={onSelectActiveChat}
              onSplitChat={onSplitChat}
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
  selectedActiveTicketId,
  onClaimChat,
  onSelectActiveChat,
  onSplitChat
}: QueueBoardColumnsProps) {
  return (
    <div className="board-columns">
      <QueueLane
        title="Pending Queue"
        count={pendingQueue.length}
        lane="pending"
        tickets={pendingQueue}
        emptyCopy="No pending requests."
        selectedActiveTicketId={selectedActiveTicketId}
        onClaimChat={onClaimChat}
        onSelectActiveChat={onSelectActiveChat}
        onSplitChat={onSplitChat}
      />
      <QueueLane
        title="Active"
        count={activeQueue.length}
        lane="active"
        tickets={activeQueue}
        emptyCopy="No active chats."
        selectedActiveTicketId={selectedActiveTicketId}
        onClaimChat={onClaimChat}
        onSelectActiveChat={onSelectActiveChat}
        onSplitChat={onSplitChat}
      />
    </div>
  );
}
