import { memo, useSyncExternalStore } from "react";
import { type Ticket } from "@/lib/dashboard-types";
import { InitialChip } from "./initial-chip";

interface QueueBoardColumnsProps {
  pendingQueue: Ticket[];
  activeQueue: Ticket[];
  currentAgentId?: string | null;
  selectedActiveTicketId: string | null;
  claimPendingTicketId?: string | null;
  onClaimChat: (ticketId: string) => void;
  onSelectActiveChat: (ticketId: string) => void;
  onSplitChat: (ticketId: string) => void;
}

interface QueueLaneCardProps {
  ticket: Ticket;
  lane: "pending" | "active";
  currentAgentId?: string | null;
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
  currentAgentId?: string | null;
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

function QueueCompactSentimentIcon() {
  return (
    <svg viewBox="0 0 11.121 8" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M7.05243 1.41184V2.84134L11.121 4.60614L5.12065 6.49313V5.64738H1.48244V8H0V0L7.05243 1.41184Z"
        fill="currentColor"
      />
    </svg>
  );
}

function QueueActiveStatusIcon() {
  return (
    <svg viewBox="0 0 11.121 8" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M7.05243 1.41184V2.84134L11.121 4.60614L5.12065 6.49313V5.64738H1.48244V8H0V0L7.05243 1.41184Z"
        fill="currentColor"
      />
    </svg>
  );
}

function useSecondTick(enabled: boolean) {
  return useSyncExternalStore(
    enabled ? subscribeToSecondTick : () => () => {},
    getSecondTickSnapshot,
    getSecondTickServerSnapshot
  );
}

const QueueCompactTimer = memo(function QueueCompactTimer({ ticket }: { ticket: Ticket }) {
  const live = ticket.status === "pending" || ticket.status === "claimed" || ticket.status === "active";
  const nowMs = useSecondTick(live);
  const { waitSeconds } = getTicketTimerLabels(ticket, nowMs);
  return <p className={getWaitTimerClassName(waitSeconds)}>{formatDuration(waitSeconds)}</p>;
});

const QueueCompactPendingMeta = memo(function QueueCompactPendingMeta({
  ticket,
  claimPending
}: {
  ticket: Ticket;
  claimPending: boolean;
}) {
  const live = ticket.status === "pending" || ticket.status === "claimed" || ticket.status === "active";
  const nowMs = useSecondTick(live);
  const { waitSeconds } = getTicketTimerLabels(ticket, nowMs);
  const compactSentimentTone = ticket.customerRating === "thumbs_up" ? "positive" : "negative";
  const compactTimeToneClass =
    waitSeconds > 40 ? " critical" : waitSeconds > 30 ? " warning" : "";

  return (
    <div className="board-queue-card-meta">
      <div className="board-queue-compact-status">
        {claimPending ? <span className="inline-button-spinner board-queue-compact-spinner" aria-hidden="true" /> : null}
        <p className={`board-queue-compact-time${compactTimeToneClass}`}>{formatDuration(waitSeconds)}</p>
      </div>
      <span className={`board-queue-compact-sentiment ${compactSentimentTone}`} aria-hidden="true">
        <QueueCompactSentimentIcon />
      </span>
    </div>
  );
});

const QueueActiveSplitButton = memo(function QueueActiveSplitButton({
  ticket,
  onSplitChat
}: {
  ticket: Ticket;
  onSplitChat: (ticketId: string) => void;
}) {
  const representativeAvatarUrl = ticket.representative?.avatarUrl?.trim() || undefined;
  const representativeInitials = getNameInitials(ticket.representative?.name, "AG");

  return (
    <button
      type="button"
      className="board-queue-action split board-queue-active-assignee-button"
      onClick={(event) => {
        event.stopPropagation();
        onSplitChat(ticket.id);
      }}
      aria-label={`Open ${ticket.fullName} in a split workspace`}
    >
      <InitialChip
        initials={representativeInitials}
        avatarUrl={representativeAvatarUrl}
        tone="sand"
        size={30}
      />
    </button>
  );
});

const QueueLaneCard = memo(function QueueLaneCard({
  ticket,
  lane,
  currentAgentId = null,
  isSelected = false,
  claimPendingTicketId = null,
  onClaimChat,
  onSelectActiveChat,
  onSplitChat
}: QueueLaneCardProps) {
  const secondaryLine =
    ticket.email.trim() && ticket.email.trim() !== ticket.fullName.trim() ? ticket.email : null;
  const interactiveCard = lane === "active" || lane === "pending";
  const claimPending = lane === "pending" && claimPendingTicketId === ticket.id;
  const sentiment = getSentimentDisplay(ticket.customerRating);
  const transferLabel =
    lane === "active" && ticket.transferRequest
      ? ticket.transferRequest.target.id === currentAgentId
        ? "Transfer requested to you"
        : ticket.transferRequest.requestedBy.id === currentAgentId
          ? `Transfer requested to ${ticket.transferRequest.target.name}`
          : `Transfer pending: ${ticket.transferRequest.target.name}`
      : null;
  const isPendingLane = lane === "pending";
  const showSelectedActiveAccent = lane === "active" && isSelected;

  const activateCard = () => {
    if (!interactiveCard) {
      return;
    }
    if (isPendingLane) {
      if (!claimPending) {
        onClaimChat(ticket.id);
      }
      return;
    }
    onSelectActiveChat(ticket.id);
  };

  return (
    <article
      className={`board-queue-card ${lane}${interactiveCard && isSelected ? " is-selected" : ""}${
        isPendingLane ? " is-compact" : ""
      }${claimPending ? " is-loading" : ""}`}
      onClick={activateCard}
      onKeyDown={(event) => {
        if (!interactiveCard) {
          return;
        }
        if (isPendingLane && claimPending) {
          return;
        }
        if (event.key !== "Enter" && event.key !== " ") {
          return;
        }
        event.preventDefault();
        activateCard();
      }}
      role={interactiveCard ? "button" : undefined}
      tabIndex={interactiveCard && !claimPending ? 0 : undefined}
      aria-pressed={lane === "active" ? isSelected : undefined}
      aria-disabled={isPendingLane ? claimPending : undefined}
      aria-busy={isPendingLane ? claimPending : undefined}
      aria-label={
        interactiveCard
          ? isPendingLane
            ? claimPending
              ? `Claiming ${ticket.fullName}`
              : `Claim pending chat for ${ticket.fullName}`
            : `Select active chat for ${ticket.fullName}`
          : undefined
      }
    >
      <div className="board-queue-card-main">
        <div className={`board-queue-identity${isPendingLane ? " compact" : ""}`}>
          <InitialChip
            initials={ticket.initials}
            tone={ticket.chipTone}
            size={isPendingLane || showSelectedActiveAccent ? 46 : undefined}
          />
          {!isPendingLane ? (
            <div className="board-queue-identity-copy">
              <div className="board-queue-identity-title">
                <strong>{ticket.fullName}</strong>
                {showSelectedActiveAccent ? (
                  <span className="board-queue-active-status-icon" aria-hidden="true">
                    <QueueActiveStatusIcon />
                  </span>
                ) : null}
              </div>
              <p>{ticket.preview}</p>
              {!showSelectedActiveAccent && secondaryLine ? <span>{secondaryLine}</span> : null}
            </div>
          ) : null}
        </div>

        {isPendingLane ? (
          <QueueCompactPendingMeta ticket={ticket} claimPending={claimPending} />
        ) : (
          <div className="board-queue-card-meta">
            <QueueCompactTimer ticket={ticket} />
            <QueueActiveSplitButton ticket={ticket} onSplitChat={onSplitChat} />
          </div>
        )}
      </div>

      {!isPendingLane && !showSelectedActiveAccent && sentiment ? (
        <p className="board-queue-sentiment">
          <span className={`board-queue-sentiment-dot ${sentiment.tone}`} aria-hidden="true" />
          {sentiment.label}
        </p>
      ) : null}
      {!isPendingLane && transferLabel ? <p className="board-queue-transfer">{transferLabel}</p> : null}
    </article>
  );
});

const QueueLane = memo(function QueueLane({
  title,
  count,
  lane,
  emptyCopy,
  tickets,
  currentAgentId = null,
  selectedActiveTicketId,
  claimPendingTicketId,
  onClaimChat,
  onSelectActiveChat,
  onSplitChat
}: QueueLaneProps) {
  const showActiveEmptyState = lane === "active" && tickets.length === 0;
  const showPendingEmptyState = lane === "pending" && tickets.length === 0;

  return (
    <section className={`board-lane ${lane}`}>
      <header className="board-lane-head">
        <div className="board-lane-title">
          <strong>{title}</strong>
          <span className={`board-lane-count${lane === "active" || lane === "pending" ? " is-badge" : ""}`}>
            {lane === "active" || lane === "pending" ? count : `(${count})`}
          </span>
        </div>
        {lane === "active" ? (
          <div className="board-lane-sort" aria-hidden="true">
            <span>Sort by:</span>
            <button type="button" tabIndex={-1}>
              <span>Unread first</span>
              <span className="board-lane-sort-chevron" aria-hidden="true">
                <svg viewBox="0 0 8 4" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path
                    d="M1 1L4 3L7 1"
                    stroke="currentColor"
                    strokeWidth="1.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
            </button>
          </div>
        ) : null}
      </header>
      <div className="board-lane-body">
        {showActiveEmptyState || showPendingEmptyState ? (
          <div className="board-lane-empty-state" aria-live="polite">
            <span className="board-lane-empty-state-icon" aria-hidden="true">
              <svg viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M5.625 9.375L9.375 5.625M10.625 7.5C10.625 9.226 9.226 10.625 7.5 10.625C5.774 10.625 4.375 9.226 4.375 7.5C4.375 5.774 5.774 4.375 7.5 4.375"
                  stroke="currentColor"
                  strokeWidth="1.35"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            <p>No chats</p>
          </div>
        ) : tickets.length === 0 ? (
          <p className="empty-state">{emptyCopy}</p>
        ) : (
          tickets.map((ticket) => (
            <QueueLaneCard
              key={ticket.id}
              ticket={ticket}
              lane={lane}
              currentAgentId={currentAgentId}
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
  currentAgentId = null,
  selectedActiveTicketId,
  claimPendingTicketId = null,
  onClaimChat,
  onSelectActiveChat,
  onSplitChat
}: QueueBoardColumnsProps) {
  return (
    <div className="board-columns">
      <QueueLane
        title="Pending"
        count={pendingQueue.length}
        lane="pending"
        tickets={pendingQueue}
        currentAgentId={currentAgentId}
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
        currentAgentId={currentAgentId}
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
