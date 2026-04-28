import {
  acceptHandoffTransfer,
  cancelHandoffTransfer,
  claimHandoff,
  declineHandoffTransfer,
  listQueue,
  markHandoffCustomerRead,
  requestHandoffTransfer,
  requestHandoff,
  resolveHandoff,
  submitHandoffRating,
  StoreError
} from "@/lib/store/mock-store";
import { type AppRole } from "@/lib/auth/types";
import { listSupportAgentDirectory } from "@/lib/support-agent-directory";
import { ServiceError } from "@/lib/service-error";

export interface HandoffRequestBody {
  conversationId?: string;
  customerName?: string;
  reason?: string;
}

export interface ClaimBody {
  requestId?: string;
  representative?: {
    id?: string;
    name?: string;
    avatarUrl?: string;
  };
}

export interface ResolveBody {
  conversationId?: string;
  resolutionNote?: string;
}

export interface RatingBody {
  conversationId?: string;
  rating?: "thumbs_up" | "thumbs_down";
}

export interface TransferRequestBody {
  requestId?: string;
  targetAgentId?: string;
  note?: string;
}

export interface TransferDecisionBody {
  transferRequestId?: string;
}

export interface MarkReadBody {
  requestId?: string;
}

function assertSupportAgentAccess(role: AppRole) {
  if (role === "support_agent" || role === "super_admin") {
    return;
  }
  throw new ServiceError(403, "Support agent dashboard access required.");
}

export async function getQueueResult(
  actorUserId: string,
  options?: {
    resolvedScope?: "all" | "agent";
  }
) {
  try {
    const queue = await listQueue(actorUserId, {
      resolvedScope: options?.resolvedScope ?? "all"
    });
    return {
      queue,
      pendingCount: queue.filter((item) => item.status === "pending").length,
      activeCount: queue.filter((item) => item.status === "active" || item.status === "claimed")
        .length,
      resolvedCount: queue.filter((item) => item.status === "resolved").length
    };
  } catch (error) {
    if (error instanceof StoreError) {
      throw new ServiceError(error.status, error.message);
    }
    throw new ServiceError(500, "Unable to load queue.");
  }
}

export async function createHandoffRequestResult(body: HandoffRequestBody, actorUserId: string) {
  if (!body.conversationId || !body.customerName) {
    throw new ServiceError(400, "conversationId and customerName are required.");
  }

  try {
    return await requestHandoff(
      {
        conversationId: body.conversationId,
        customerName: body.customerName,
        reason: body.reason
      },
      actorUserId
    );
  } catch (error) {
    if (error instanceof StoreError) {
      throw new ServiceError(error.status, error.message);
    }
    throw new ServiceError(500, error instanceof Error ? error.message : "Unable to request handoff.");
  }
}

export async function createHandoffClaimResult(body: ClaimBody, actorUserId: string) {
  if (!body.requestId || !body.representative?.id || !body.representative?.name) {
    throw new ServiceError(400, "requestId and representative {id, name} are required.");
  }

  try {
    return await claimHandoff(
      {
        requestId: body.requestId,
        representative: {
          id: body.representative.id,
          name: body.representative.name,
          avatarUrl: body.representative.avatarUrl
        }
      },
      actorUserId
    );
  } catch (error) {
    if (error instanceof StoreError) {
      throw new ServiceError(error.status, error.message);
    }
    throw new ServiceError(500, error instanceof Error ? error.message : "Unable to claim handoff.");
  }
}

export async function createHandoffResolveResult(body: ResolveBody, actorUserId: string) {
  if (!body.conversationId) {
    throw new ServiceError(400, "conversationId is required.");
  }

  try {
    return await resolveHandoff(
      {
        conversationId: body.conversationId,
        resolutionNote: body.resolutionNote
      },
      actorUserId
    );
  } catch (error) {
    if (error instanceof StoreError) {
      throw new ServiceError(error.status, error.message);
    }
    throw new ServiceError(500, error instanceof Error ? error.message : "Unable to resolve handoff.");
  }
}

export async function createHandoffRatingResult(body: RatingBody, actorUserId: string) {
  if (!body.conversationId) {
    throw new ServiceError(400, "conversationId is required.");
  }
  if (body.rating !== "thumbs_up" && body.rating !== "thumbs_down") {
    throw new ServiceError(400, "rating must be thumbs_up or thumbs_down.");
  }

  try {
    return await submitHandoffRating(
      {
        conversationId: body.conversationId,
        rating: body.rating
      },
      actorUserId
    );
  } catch (error) {
    if (error instanceof StoreError) {
      throw new ServiceError(error.status, error.message);
    }
    throw new ServiceError(
      500,
      error instanceof Error ? error.message : "Unable to submit handoff rating."
    );
  }
}

export async function getTransferCandidatesResult(actorUserId: string, actorRole: AppRole) {
  assertSupportAgentAccess(actorRole);

  try {
    return {
      agents: await listSupportAgentDirectory({
        excludeUserId: actorUserId
      })
    };
  } catch (error) {
    if (error instanceof ServiceError) {
      throw error;
    }
    throw new ServiceError(
      500,
      error instanceof Error ? error.message : "Unable to load transfer candidates."
    );
  }
}

export async function createTransferRequestResult(body: TransferRequestBody, actorUserId: string) {
  if (!body.requestId || !body.targetAgentId) {
    throw new ServiceError(400, "requestId and targetAgentId are required.");
  }

  try {
    return await requestHandoffTransfer(
      {
        requestId: body.requestId,
        targetAgentId: body.targetAgentId,
        note: body.note
      },
      actorUserId
    );
  } catch (error) {
    if (error instanceof StoreError) {
      throw new ServiceError(error.status, error.message);
    }
    throw new ServiceError(
      500,
      error instanceof Error ? error.message : "Unable to request transfer."
    );
  }
}

export async function createTransferAcceptResult(body: TransferDecisionBody, actorUserId: string) {
  if (!body.transferRequestId) {
    throw new ServiceError(400, "transferRequestId is required.");
  }

  try {
    return await acceptHandoffTransfer(
      {
        transferRequestId: body.transferRequestId
      },
      actorUserId
    );
  } catch (error) {
    if (error instanceof StoreError) {
      throw new ServiceError(error.status, error.message);
    }
    throw new ServiceError(
      500,
      error instanceof Error ? error.message : "Unable to accept transfer."
    );
  }
}

export async function createTransferDeclineResult(body: TransferDecisionBody, actorUserId: string) {
  if (!body.transferRequestId) {
    throw new ServiceError(400, "transferRequestId is required.");
  }

  try {
    return await declineHandoffTransfer(
      {
        transferRequestId: body.transferRequestId
      },
      actorUserId
    );
  } catch (error) {
    if (error instanceof StoreError) {
      throw new ServiceError(error.status, error.message);
    }
    throw new ServiceError(
      500,
      error instanceof Error ? error.message : "Unable to decline transfer."
    );
  }
}

export async function createTransferCancelResult(body: TransferDecisionBody, actorUserId: string) {
  if (!body.transferRequestId) {
    throw new ServiceError(400, "transferRequestId is required.");
  }

  try {
    return await cancelHandoffTransfer(
      {
        transferRequestId: body.transferRequestId
      },
      actorUserId
    );
  } catch (error) {
    if (error instanceof StoreError) {
      throw new ServiceError(error.status, error.message);
    }
    throw new ServiceError(
      500,
      error instanceof Error ? error.message : "Unable to cancel transfer."
    );
  }
}

export async function createHandoffMarkReadResult(body: MarkReadBody, actorUserId: string) {
  if (!body.requestId) {
    throw new ServiceError(400, "requestId is required.");
  }

  try {
    return await markHandoffCustomerRead(
      {
        requestId: body.requestId
      },
      actorUserId
    );
  } catch (error) {
    if (error instanceof StoreError) {
      throw new ServiceError(error.status, error.message);
    }
    throw new ServiceError(
      500,
      error instanceof Error ? error.message : "Unable to mark customer message as read."
    );
  }
}
