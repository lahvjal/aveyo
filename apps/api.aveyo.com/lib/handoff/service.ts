import {
  claimHandoff,
  listQueue,
  requestHandoff,
  resolveHandoff,
  StoreError
} from "@/lib/store/mock-store";
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
