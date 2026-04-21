export type TicketTone = "sand" | "blue";
export type TicketQueueStatus = "pending" | "claimed" | "active" | "resolved";

export interface Ticket {
  id: string;
  conversationId: string;
  status: TicketQueueStatus;
  fullName: string;
  email: string;
  initials: string;
  waitLabel: string;
  waitSeconds: number;
  lapsedLabel?: string;
  preview: string;
  chipTone: TicketTone;
  requestedAt: string;
  claimedAt: string | null;
  elapsedWaitSeconds: number;
  claimedByAuthUserId: string | null;
  resolvedAt: string | null;
  resolvedByAuthUserId: string | null;
  lastMessageAt?: string | null;
  hasUnreadCustomerReply?: boolean;
  representative?: {
    id: string;
    name: string;
    avatarUrl?: string;
  };
  customerRating: "thumbs_up" | "thumbs_down" | null;
  transferRequest?: {
    id: string;
    requestedAt: string;
    note?: string;
    requestedBy: {
      id: string;
      name: string;
      avatarUrl?: string;
    };
    target: {
      id: string;
      name: string;
      avatarUrl?: string;
    };
  };
}

export interface HistoryNote {
  id: string;
  author: string;
  timestamp: string;
  body: string;
}

export interface CustomerPanelDetails {
  customerId: string;
  email: string;
  phone: string;
  address: string;
  fin: string;
  projectRef: string;
  projectStatus: string;
}
