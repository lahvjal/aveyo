import { type ReactNode, useLayoutEffect, useRef } from "react";
import {
  type ConversationThread,
  type HandoffFeedbackRequest,
  type HandoffRating,
  type RepresentativeProfile,
  type TimelineMessage
} from "@ava/chat-domain";
import { HandoffRequestModal } from "./handoff-request-modal";

interface WidgetTimelineProps {
  thread: ConversationThread;
  showAvaTyping?: boolean;
  showRepresentativeTyping?: boolean;
  showRequestModal: boolean;
  requestSubmissionPending?: boolean;
  requestReason: string;
  ratingSubmissionRequestId?: string | null;
  onRequestReasonChange: (value: string) => void;
  onCancelRequest: () => void;
  onSubmitRequest: () => void;
  onSubmitHandoffRating?: (requestId: string, rating: HandoffRating) => void;
}

function formatSystemRow(message: TimelineMessage) {
  if (message.kind !== "system") {
    return message.text;
  }
  return message.text;
}

function getFeedbackRequest(message: TimelineMessage): HandoffFeedbackRequest | undefined {
  if (message.kind === "ava" || message.kind === "system") {
    return message.feedbackRequest;
  }
  return undefined;
}

function isSystemRatingRequest(message: TimelineMessage) {
  if (message.kind !== "system") {
    return false;
  }

  return Boolean(
    message.feedbackRequest &&
      message.feedbackRequest.type === "handoff_rating" &&
      message.feedbackRequest.requestId
  );
}

function getRepresentativeProfiles(thread: ConversationThread) {
  const representativeById = new Map<string, RepresentativeProfile>();
  if (thread.activeRepresentative?.id) {
    representativeById.set(thread.activeRepresentative.id, thread.activeRepresentative);
  }

  for (const message of thread.messages) {
    if (message.kind === "representative" && message.representative?.id) {
      representativeById.set(message.representative.id, message.representative);
      continue;
    }

    if (message.kind !== "system" || !message.representative?.id) {
      continue;
    }
    representativeById.set(message.representative.id, message.representative);
  }

  return representativeById;
}

function getRepresentativeInitial(name: string | undefined) {
  const value = typeof name === "string" ? name.trim() : "";
  if (!value) {
    return "R";
  }
  return value[0]?.toUpperCase() ?? "R";
}

function stripInlineMarkdown(value: string) {
  return value
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/__(.*?)__/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/^#{1,6}\s+/gm, "");
}

function renderInlineMessageText(text: string, formatStructuredLines: boolean): ReactNode {
  if (!formatStructuredLines) {
    return text;
  }

  const normalizedText = stripInlineMarkdown(text).replace(/\r\n?/g, "\n");
  const lines = normalizedText.split("\n");
  return (
    <span className="widget-message-text">
      {lines.map((rawLine, index) => {
        const line = rawLine.trimEnd();
        if (!line.trim()) {
          return <span key={`line-${index}`} className="widget-message-line spacer" />;
        }

        const sectionMatch = line.match(/^([A-Za-z][A-Za-z0-9/&()\- ]{2,60}):$/);
        if (sectionMatch) {
          return (
            <span key={`line-${index}`} className="widget-message-line heading">
              {sectionMatch[1]}
            </span>
          );
        }

        const bulletMatch = line.match(/^[-*\u2022]\s+(.*)$/);
        if (bulletMatch) {
          const itemText = bulletMatch[1].trim();
          const labelMatch = itemText.match(/^([^:]{2,48}):\s*(.+)$/);
          if (labelMatch) {
            return (
              <span key={`line-${index}`} className="widget-message-line item">
                <span className="widget-message-item-label">{labelMatch[1]}:</span>{" "}
                {labelMatch[2]}
              </span>
            );
          }

          return (
            <span key={`line-${index}`} className="widget-message-line item">
              {itemText}
            </span>
          );
        }

        return (
          <span key={`line-${index}`} className="widget-message-line">
            {line}
          </span>
        );
      })}
    </span>
  );
}

export function WidgetTimeline({
  thread,
  showAvaTyping = false,
  showRepresentativeTyping = false,
  showRequestModal,
  requestSubmissionPending = false,
  requestReason,
  ratingSubmissionRequestId,
  onRequestReasonChange,
  onCancelRequest,
  onSubmitRequest,
  onSubmitHandoffRating
}: WidgetTimelineProps) {
  const timelineRef = useRef<HTMLDivElement | null>(null);
  const latestMessageId = thread.messages[thread.messages.length - 1]?.id ?? "";
  const submittedRatingByRequestId = new Map<string, HandoffRating>();
  const representativeById = getRepresentativeProfiles(thread);
  const activeRepresentative = thread.activeRepresentative;
  const representativeTypingProfile =
    activeRepresentative ?? representativeById.values().next().value;

  for (const message of thread.messages) {
    const feedbackRequest = getFeedbackRequest(message);
    if (!feedbackRequest?.requestId || !feedbackRequest.submittedRating) {
      continue;
    }

    submittedRatingByRequestId.set(feedbackRequest.requestId, feedbackRequest.submittedRating);
  }

  useLayoutEffect(() => {
    const container = timelineRef.current;
    if (!container) {
      return;
    }
    container.scrollTop = container.scrollHeight;
  }, [thread.id, latestMessageId, showAvaTyping, showRepresentativeTyping, showRequestModal]);

  return (
    <div
      ref={timelineRef}
      className="widget-timeline"
      style={{ overflowY: "auto", minHeight: 0, WebkitOverflowScrolling: "touch" }}
    >
      {thread.messages.map((message) => {
        const feedbackRequest = getFeedbackRequest(message);
        const isRatingRequest = isSystemRatingRequest(message);
        const submittedRating = feedbackRequest?.requestId
          ? submittedRatingByRequestId.get(feedbackRequest.requestId) ??
            feedbackRequest.submittedRating ??
            null
          : null;
        const showFeedbackControls = isRatingRequest;
        const ratingPending =
          Boolean(feedbackRequest?.requestId) &&
          ratingSubmissionRequestId === feedbackRequest?.requestId;

        if (message.kind === "system") {
          return (
            <div key={message.id}>
              <div className={`system-row${isRatingRequest ? " rating" : ""}`}>
                <span className={`status-check${isRatingRequest ? " rating" : ""}`}>
                  {isRatingRequest ? "★" : "✓"}
                </span>
                <strong>{formatSystemRow(message)}</strong>
              </div>

              {showFeedbackControls && feedbackRequest?.requestId ? (
                <div className="handoff-rating-card inline-status">
                  <div className="handoff-rating-actions">
                    <button
                      type="button"
                      className={`handoff-rating-button up${
                        submittedRating === "thumbs_up" ? " is-selected" : ""
                      }`}
                      onClick={() =>
                        onSubmitHandoffRating?.(feedbackRequest.requestId, "thumbs_up")
                      }
                      disabled={Boolean(submittedRating) || ratingPending}
                      aria-label="Rate thumbs up"
                    >
                      <img
                        src="/images/thumbsup.svg"
                        alt=""
                        aria-hidden="true"
                        className="handoff-rating-icon"
                      />
                    </button>
                    <button
                      type="button"
                      className={`handoff-rating-button down${
                        submittedRating === "thumbs_down" ? " is-selected" : ""
                      }`}
                      onClick={() =>
                        onSubmitHandoffRating?.(feedbackRequest.requestId, "thumbs_down")
                      }
                      disabled={Boolean(submittedRating) || ratingPending}
                      aria-label="Rate thumbs down"
                    >
                      <img
                        src="/images/thumbsdown.svg"
                        alt=""
                        aria-hidden="true"
                        className="handoff-rating-icon"
                      />
                    </button>
                  </div>
                  {ratingPending ? (
                    <p className="handoff-rating-pending" role="status" aria-live="polite">
                      <span className="request-action-spinner" aria-hidden="true" /> Submitting rating...
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>
          );
        }

        const isCustomer = message.kind === "customer";
        const hasRep = message.kind === "representative";
        const representativeProfile =
          hasRep
            ? message.representative ??
              (message.representativeId
                ? representativeById.get(message.representativeId) ?? activeRepresentative
                : activeRepresentative)
            : activeRepresentative;
        const representativeAvatarUrl = representativeProfile?.avatarUrl?.trim() ?? "";
        const representativeName = representativeProfile?.name;
        const shouldFormatStructuredText = message.kind === "ava";

        return (
          <div key={message.id}>
            <div className={isCustomer ? "timeline-row right" : "timeline-row left"}>
              {!isCustomer && (
                <div className="row-avatar">
                  {hasRep ? (
                    representativeAvatarUrl ? (
                      <img
                        src={representativeAvatarUrl}
                        alt={representativeName ? `${representativeName} avatar` : "Representative avatar"}
                        width={25}
                        height={25}
                      />
                    ) : (
                      <span className="row-avatar-fallback" aria-hidden>
                        {getRepresentativeInitial(representativeName)}
                      </span>
                    )
                  ) : (
                    <span className="row-avatar-ava" aria-hidden />
                  )}
                </div>
              )}
              <p className={`widget-bubble ${isCustomer ? "outgoing" : "incoming"}`}>
                {renderInlineMessageText(message.text, shouldFormatStructuredText)}
              </p>
            </div>
          </div>
        );
      })}

      {showRepresentativeTyping ? (
        <div className="timeline-row left">
          <div className="row-avatar">
            {representativeTypingProfile?.avatarUrl?.trim() ? (
              <img
                src={representativeTypingProfile.avatarUrl}
                alt={
                  representativeTypingProfile.name
                    ? `${representativeTypingProfile.name} avatar`
                    : "Representative avatar"
                }
                width={25}
                height={25}
              />
            ) : (
              <span className="row-avatar-fallback" aria-hidden>
                {getRepresentativeInitial(representativeTypingProfile?.name)}
              </span>
            )}
          </div>
          <div className="widget-typing-bubble" aria-label="Representative is typing" aria-live="polite">
            <span className="widget-typing-dot" />
            <span className="widget-typing-dot" />
            <span className="widget-typing-dot" />
          </div>
        </div>
      ) : null}

      {showAvaTyping ? (
        <div className="timeline-row left">
          <div className="row-avatar">
            <span className="row-avatar-ava" aria-hidden />
          </div>
          <div className="widget-typing-bubble" aria-label="Ava is typing" aria-live="polite">
            <span className="widget-typing-dot" />
            <span className="widget-typing-dot" />
            <span className="widget-typing-dot" />
          </div>
        </div>
      ) : null}

      {showRequestModal ? (
        <HandoffRequestModal
          requestReason={requestReason}
          submitting={requestSubmissionPending}
          onRequestReasonChange={onRequestReasonChange}
          onCancel={onCancelRequest}
          onSubmit={onSubmitRequest}
        />
      ) : null}
    </div>
  );
}
