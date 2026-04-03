import { useLayoutEffect, useRef } from "react";
import { type ConversationThread, type HandoffFeedbackRequest, type HandoffRating, type TimelineMessage } from "@ava/chat-domain";
import { AvaOrb } from "@ava/ui";
import { HandoffRequestModal } from "./handoff-request-modal";

interface WidgetTimelineProps {
  thread: ConversationThread;
  showRequestModal: boolean;
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

export function WidgetTimeline({
  thread,
  showRequestModal,
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
  }, [thread.id, latestMessageId]);

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
                </div>
              ) : null}
            </div>
          );
        }

        const isCustomer = message.kind === "customer";
        const hasRep = message.kind === "representative";

        return (
          <div key={message.id}>
            <div className={isCustomer ? "timeline-row right" : "timeline-row left"}>
              {!isCustomer && (
                <div className="row-avatar">
                  {hasRep ? (
                    <img
                      src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=facearea&w=80&h=80"
                      alt="Representative avatar"
                      width={25}
                      height={25}
                    />
                  ) : (
                    <AvaOrb size={25} />
                  )}
                </div>
              )}
              <p className={`widget-bubble ${isCustomer ? "outgoing" : "incoming"}`}>
                {message.text}
              </p>
            </div>
          </div>
        );
      })}

      {showRequestModal ? (
        <HandoffRequestModal
          requestReason={requestReason}
          onRequestReasonChange={onRequestReasonChange}
          onCancel={onCancelRequest}
          onSubmit={onSubmitRequest}
        />
      ) : null}
    </div>
  );
}
