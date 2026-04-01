import {
  createImpersonationConversation,
  listImpersonationCustomers,
  StoreError
} from "@/lib/store/mock-store";
import { ServiceError } from "@/lib/service-error";

export interface ListImpersonationCustomersQuery {
  query?: string;
  limit?: string;
}

export interface CreateImpersonationConversationBody {
  projectRef?: string;
  customerName?: string;
  customerEmail?: string;
  greetingText?: string;
}

function parseLimit(rawLimit: string | undefined) {
  if (!rawLimit) {
    return 25;
  }

  const parsed = Number.parseInt(rawLimit, 10);
  if (!Number.isFinite(parsed)) {
    return 25;
  }
  if (parsed < 1) {
    return 1;
  }
  return Math.min(parsed, 100);
}

export async function getImpersonationCustomersResult(
  actorUserId: string,
  query: ListImpersonationCustomersQuery
) {
  try {
    const customers = await listImpersonationCustomers(actorUserId, {
      query: query.query?.trim() || undefined,
      limit: parseLimit(query.limit)
    });
    return { customers };
  } catch (error) {
    if (error instanceof StoreError) {
      throw new ServiceError(error.status, error.message);
    }
    throw new ServiceError(500, "Unable to load impersonation customers.");
  }
}

export async function createImpersonationConversationResult(
  actorUserId: string,
  body: CreateImpersonationConversationBody
) {
  if (!body.projectRef?.trim()) {
    throw new ServiceError(400, "projectRef is required.");
  }

  try {
    const conversation = await createImpersonationConversation(actorUserId, {
      projectRef: body.projectRef,
      customerName: body.customerName,
      customerEmail: body.customerEmail,
      greetingText: body.greetingText
    });
    return { conversation };
  } catch (error) {
    if (error instanceof StoreError) {
      throw new ServiceError(error.status, error.message);
    }
    throw new ServiceError(500, "Unable to create impersonation conversation.");
  }
}
