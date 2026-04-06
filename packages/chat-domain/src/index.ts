export type MessageDeliveryState = "sent" | "sending" | "failed";

export type SystemEvent =
  | "request_sent"
  | "queue_update"
  | "connected"
  | "disconnected"
  | "rate_limited"
  | "delivery_failed";

export interface RepresentativeProfile {
  id: string;
  name: string;
  avatarUrl?: string;
}

export interface QueueSnapshot {
  requestId: string;
  position: number;
  estimatedWaitSeconds: number;
  elapsedWaitSeconds: number;
  reason?: string;
}

export type HandoffState = "none" | "pending" | "claimed" | "active" | "resolved";

export type HandoffRating = "thumbs_up" | "thumbs_down";

export interface HandoffFeedbackRequest {
  type: "handoff_rating";
  requestId: string;
  representativeName: string;
  submittedRating?: HandoffRating | null;
}

export interface HandoffSnapshot {
  state: HandoffState;
  requestId?: string;
  requestedAt?: string;
  queue?: QueueSnapshot;
}

export type TimelineMessage =
  | {
      id: string;
      conversationId: string;
      kind: "customer";
      text: string;
      createdAt: string;
      deliveryState: MessageDeliveryState;
    }
  | {
      id: string;
      conversationId: string;
      kind: "representative";
      text: string;
      createdAt: string;
      deliveryState: MessageDeliveryState;
      representativeId?: string;
      representative?: RepresentativeProfile;
    }
  | {
      id: string;
      conversationId: string;
      kind: "ava";
      text: string;
      createdAt: string;
      deliveryState: MessageDeliveryState;
      feedbackRequest?: HandoffFeedbackRequest;
    }
  | {
      id: string;
      conversationId: string;
      kind: "system";
      text: string;
      createdAt: string;
      deliveryState: MessageDeliveryState;
      systemEvent?: SystemEvent;
      representative?: RepresentativeProfile;
      queue?: QueueSnapshot;
      feedbackRequest?: HandoffFeedbackRequest;
    };

export interface ConversationThread {
  id: string;
  authenticated: boolean;
  messages: TimelineMessage[];
  handoff: HandoffSnapshot;
  activeRepresentative?: RepresentativeProfile;
  updatedAt: string;
}
