import Image from "next/image";
import { type ConversationThread, type TimelineMessage } from "@ava/chat-domain";
import { AvaOrb } from "@ava/ui";
import { HandoffRequestModal } from "./handoff-request-modal";

interface WidgetTimelineProps {
  thread: ConversationThread;
  showRequestModal: boolean;
  requestReason: string;
  onRequestReasonChange: (value: string) => void;
  onCancelRequest: () => void;
  onSubmitRequest: () => void;
}

function formatSystemRow(message: TimelineMessage) {
  if (message.kind !== "system") {
    return message.text;
  }
  return message.text;
}

export function WidgetTimeline({
  thread,
  showRequestModal,
  requestReason,
  onRequestReasonChange,
  onCancelRequest,
  onSubmitRequest
}: WidgetTimelineProps) {
  return (
    <div className="widget-timeline">
      {thread.messages.map((message) => {
        if (message.kind === "system") {
          return (
            <div key={message.id} className="system-row">
              <span className="status-check">✓</span>
              <strong>{formatSystemRow(message)}</strong>
            </div>
          );
        }

        const isCustomer = message.kind === "customer";
        const hasRep = message.kind === "representative";

        return (
          <div key={message.id} className={isCustomer ? "timeline-row right" : "timeline-row left"}>
            {!isCustomer && (
              <div className="row-avatar">
                {hasRep ? (
                  <Image
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
