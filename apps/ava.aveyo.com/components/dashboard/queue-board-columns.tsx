import { memo, useSyncExternalStore } from "react";
import { type Ticket } from "@/lib/dashboard-types";
import { InitialChip } from "./initial-chip";

interface QueueBoardColumnsProps {
  pendingQueue: Ticket[];
  activeQueue: Ticket[];
  selectedActiveTicketId: string | null;
  claimPendingTicketId?: string | null;
  onClaimChat: (ticketId: string) => void;
  onSelectActiveChat: (ticketId: string) => void;
  onSplitChat: (ticketId: string) => void;
}

interface QueueLaneCardProps {
  ticket: Ticket;
  lane: "pending" | "active";
  isSelected?: boolean;
  claimPendingTicketId?: string | null;
  onClaimChat: (ticketId: string) => void;
  onSelectActiveChat: (ticketId: string) => void;
  onSplitChat: (ticketId: string) => void;
}

interface QueueLaneProps {
  title: string;
  count: number;
  lane: "pending" | "active";
  emptyCopy: string;
  tickets: Ticket[];
  selectedActiveTicketId: string | null;
  claimPendingTicketId?: string | null;
  onClaimChat: (ticketId: string) => void;
  onSelectActiveChat: (ticketId: string) => void;
  onSplitChat: (ticketId: string) => void;
}

function getWaitTimerClassName(waitSeconds: number) {
  if (waitSeconds > 40) {
    return "board-queue-wait timer-critical";
  }
  if (waitSeconds > 30) {
    return "board-queue-wait timer-warning";
  }
  return "board-queue-wait";
}

function getSentimentDisplay(rating: "thumbs_up" | "thumbs_down" | null) {
  if (rating === "thumbs_up") {
    return { tone: "positive" as const, label: "Positive" };
  }
  if (rating === "thumbs_down") {
    return { tone: "negative" as const, label: "Negative" };
  }
  return null;
}

function parseIsoToMs(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? null : parsed;
}

function formatDuration(totalSeconds: number) {
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

function toElapsedSeconds(startMs: number, endMs: number) {
  return Math.max(0, Math.floor((endMs - startMs) / 1000));
}

function getTicketTimerLabels(ticket: Ticket, nowMs: number) {
  const requestedAtMs = parseIsoToMs(ticket.requestedAt) ?? nowMs;
  const claimedAtMs = parseIsoToMs(ticket.claimedAt);
  const resolvedAtMs = parseIsoToMs(ticket.resolvedAt);

  const waitedSeconds =
    ticket.status === "pending"
      ? toElapsedSeconds(requestedAtMs, nowMs)
      : claimedAtMs !== null
        ? toElapsedSeconds(requestedAtMs, claimedAtMs)
        : Math.max(0, Math.floor(ticket.elapsedWaitSeconds));

  const waitLabel = `${ticket.status === "pending" ? "Waiting" : "Waited"}: ${formatDuration(waitedSeconds)}`;

  if (claimedAtMs === null || ticket.status === "pending") {
    return { waitLabel, waitSeconds: waitedSeconds, lapsedLabel: null as string | null };
  }

  const lapsedEndMs = ticket.status === "resolved" ? (resolvedAtMs ?? claimedAtMs) : nowMs;
  return {
    waitLabel,
    waitSeconds: waitedSeconds,
    lapsedLabel: `Time lapsed: ${formatDuration(toElapsedSeconds(claimedAtMs, lapsedEndMs))}`
  };
}

const secondTickListeners = new Set<() => void>();
let secondTickIntervalId: number | null = null;

function subscribeToSecondTick(listener: () => void) {
  secondTickListeners.add(listener);
  if (typeof window !== "undefined" && secondTickIntervalId === null) {
    secondTickIntervalId = window.setInterval(() => {
      secondTickListeners.forEach((subscriber) => subscriber());
    }, 1000);
  }

  return () => {
    secondTickListeners.delete(listener);
    if (secondTickListeners.size === 0 && secondTickIntervalId !== null && typeof window !== "undefined") {
      window.clearInterval(secondTickIntervalId);
      secondTickIntervalId = null;
    }
  };
}

function getSecondTickSnapshot() {
  return Date.now();
}

function getSecondTickServerSnapshot() {
  return Date.now();
}

function useSecondTick(enabled: boolean) {
  return useSyncExternalStore(
    enabled ? subscribeToSecondTick : () => () => {},
    getSecondTickSnapshot,
    getSecondTickServerSnapshot
  );
}

const QueueTimerLabels = memo(function QueueTimerLabels({ ticket }: { ticket: Ticket }) {
  const live = ticket.status === "pending" || ticket.status === "claimed" || ticket.status === "active";
  const nowMs = useSecondTick(live);
  const { waitLabel, waitSeconds, lapsedLabel } = getTicketTimerLabels(ticket, nowMs);

  return (
    <>
      <p className={getWaitTimerClassName(waitSeconds)}>{waitLabel}</p>
      {lapsedLabel ? <p className="board-queue-lapsed">{lapsedLabel}</p> : null}
    </>
  );
});

const QueueLaneCard = memo(function QueueLaneCard({
  ticket,
  lane,
  isSelected = false,
  claimPendingTicketId = null,
  onClaimChat,
  onSelectActiveChat,
  onSplitChat
}: QueueLaneCardProps) {
  const secondaryLine =
    ticket.email.trim() && ticket.email.trim() !== ticket.fullName.trim() ? ticket.email : null;
  const interactiveCard = lane === "active";
  const claimPending = lane === "pending" && claimPendingTicketId === ticket.id;
  const sentiment = getSentimentDisplay(ticket.customerRating);

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
      <QueueTimerLabels ticket={ticket} />
      {sentiment ? (
        <p className="board-queue-sentiment">
          <span className={`board-queue-sentiment-dot ${sentiment.tone}`} aria-hidden="true" />
          {sentiment.label}
        </p>
      ) : null}
      <p className="board-queue-preview">{`"${ticket.preview}"`}</p>
      {lane === "pending" ? (
        <button
          type="button"
          className={`board-queue-action claim${claimPending ? " is-loading" : ""}`}
          onClick={() => onClaimChat(ticket.id)}
          disabled={claimPending}
        >
          {claimPending ? (
            <>
              <span className="inline-button-spinner" aria-hidden="true" />
              Claiming...
            </>
          ) : (
            "Claim Chat"
          )}
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
});

const QueueLane = memo(function QueueLane({
  title,
  count,
  lane,
  emptyCopy,
  tickets,
  selectedActiveTicketId,
  claimPendingTicketId,
  onClaimChat,
  onSelectActiveChat,
  onSplitChat
}: QueueLaneProps) {
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
              claimPendingTicketId={claimPendingTicketId}
              onClaimChat={onClaimChat}
              onSelectActiveChat={onSelectActiveChat}
              onSplitChat={onSplitChat}
            />
          ))
        )}
      </div>
    </section>
  );
});

export const QueueBoardColumns = memo(function QueueBoardColumns({
  pendingQueue,
  activeQueue,
  selectedActiveTicketId,
  claimPendingTicketId = null,
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
        claimPendingTicketId={claimPendingTicketId}
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
        claimPendingTicketId={claimPendingTicketId}
        onClaimChat={onClaimChat}
        onSelectActiveChat={onSelectActiveChat}
        onSplitChat={onSplitChat}
      />
    </div>
  );
});
