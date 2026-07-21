export interface QueueTransferRequest {
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
}

export interface QueueRecord {
  requestId: string;
  conversationId: string;
  customerName: string;
  impersonationByName?: string | null;
  reason?: string;
  status: "pending" | "claimed" | "active" | "resolved";
  position: number;
  estimatedWaitSeconds: number;
  elapsedWaitSeconds: number;
  representative?: {
    id: string;
    name: string;
    avatarUrl?: string;
  };
  requestedAt: string;
  claimedAt: string | null;
  claimedByAuthUserId: string | null;
  resolvedAt: string | null;
  resolvedByAuthUserId: string | null;
  lastMessageAt?: string | null;
  hasUnreadCustomerReply?: boolean;
  customerRating: "thumbs_up" | "thumbs_down" | null;
  transferRequest?: QueueTransferRequest;
}

export interface RealtimeEvent {
  id: string;
  type: "message_created" | "handoff_requested" | "handoff_claimed" | "handoff_resolved" | "typing";
  conversationId: string;
  createdAt: string;
  payload: unknown;
}

export interface SupportAgentNote {
  id: string;
  conversationId: string;
  author: {
    id: string;
    name: string;
  };
  body: string;
  createdAt: string;
}

export interface ConversationCustomerDetails {
  conversationId: string;
  customer: {
    authUserId: string;
    profileId: string | null;
    customerId: string | null;
    fullName: string | null;
    email: string | null;
    phone: string | null;
    address: string | null;
    fin: string | null;
  };
  project: {
    projectRef: string | null;
    projectStatus: string | null;
    siteAddress: string | null;
    podioItemId?: string | null;
    podioLink?: string | null;
    metadata: Record<string, unknown>;
  };
}

export interface ImpersonationCustomer {
  projectRef: string;
  customerId: string | null;
  customerName: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  projectStatus: string | null;
  projectTitle: string | null;
}

export interface TransferCandidate {
  id: string;
  name: string;
  avatarUrl: string | null;
  status: "online" | "offline";
}

