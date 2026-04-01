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

