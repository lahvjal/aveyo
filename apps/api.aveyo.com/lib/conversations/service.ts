import { type TimelineMessage } from "@ava/chat-domain";
import { generateAvaReplyText } from "@/lib/ava/service";
import {
  appendAvaMessage,
  appendMessage,
  createConversation,
  getAvaConversationContext,
  getConversationCustomerDetails,
  getConversation,
  listConversations,
  StoreError
} from "@/lib/store/mock-store";
import { ServiceError } from "@/lib/service-error";

export interface MessageBody {
  conversationId?: string;
  kind?: TimelineMessage["kind"];
  text?: string;
  representativeId?: string;
  clientMessageId?: string;
}

export interface CreateConversationBody {
  subject?: string;
  projectRef?: string;
  greetingText?: string;
}

function allowsAvaReply(
  handoffState: "none" | "pending" | "claimed" | "active" | "resolved"
) {
  return handoffState === "none" || handoffState === "resolved";
}

async function tryGenerateAvaReply(params: {
  conversationId: string;
  actorUserId: string;
}) {
  const thread = await getConversation(params.conversationId, params.actorUserId);
  if (!thread || !allowsAvaReply(thread.handoff.state)) {
    return;
  }

  const abortController = new AbortController();
  const timeoutId = setTimeout(() => {
    abortController.abort();
  }, 8000);

  try {
    let context: Awaited<ReturnType<typeof getAvaConversationContext>> | undefined;
    try {
      context = await getAvaConversationContext(params.conversationId, params.actorUserId);
    } catch {
      context = undefined;
    }

    const replyText = await generateAvaReplyText(thread, context, abortController.signal);
    if (!replyText) {
      return;
    }
    await appendAvaMessage(params.conversationId, replyText);
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function getConversationsResult(
  actorUserId: string,
  options?: {
    excludeImpersonation?: boolean;
    ownOnly?: boolean;
  }
) {
  try {
    return {
      conversations: await listConversations(actorUserId, {
        excludeImpersonation: options?.excludeImpersonation,
        ownOnly: options?.ownOnly
      })
    };
  } catch (error) {
    if (error instanceof StoreError) {
      throw new ServiceError(error.status, error.message);
    }
    throw new ServiceError(500, "Unable to load conversations.");
  }
}

export async function createConversationResult(
  actorUserId: string,
  body: CreateConversationBody
) {
  try {
    const conversation = await createConversation(actorUserId, {
      subject: body.subject,
      projectRef: body.projectRef,
      greetingText: body.greetingText
    });
    return { conversation };
  } catch (error) {
    if (error instanceof StoreError) {
      throw new ServiceError(error.status, error.message);
    }
    throw new ServiceError(500, "Unable to create conversation.");
  }
}

export async function getConversationResult(conversationId: string, actorUserId: string) {
  const conversation = await getConversation(conversationId, actorUserId);
  if (!conversation) {
    throw new ServiceError(404, "Conversation not found.");
  }

  return { conversation };
}

export async function getConversationCustomerDetailsResult(
  conversationId: string,
  actorUserId: string
) {
  try {
    const details = await getConversationCustomerDetails(conversationId, actorUserId);
    return { details };
  } catch (error) {
    if (error instanceof StoreError) {
      throw new ServiceError(error.status, error.message);
    }
    throw new ServiceError(500, "Unable to load conversation customer details.");
  }
}

export async function createMessageResult(body: MessageBody, actorUserId: string) {
  if (!body.conversationId || !body.kind || !body.text?.trim()) {
    throw new ServiceError(400, "conversationId, kind, and text are required.");
  }
  if (body.kind === "system") {
    throw new ServiceError(400, "Use handoff endpoints for system status updates.");
  }

  const payload =
    body.kind === "representative"
      ? {
          kind: body.kind,
          representativeId: body.representativeId ?? "rep-unknown",
          text: body.text,
          clientMessageId: body.clientMessageId
        }
      : {
          kind: body.kind,
          text: body.text,
          clientMessageId: body.clientMessageId
        };

  try {
    const message = await appendMessage(body.conversationId, payload, actorUserId);

    if (body.kind === "customer") {
      try {
        await tryGenerateAvaReply({
          conversationId: body.conversationId,
          actorUserId
        });
      } catch {
        // Keep customer messaging reliable even if AI generation fails.
      }
    }

    return { message };
  } catch (error) {
    if (error instanceof StoreError) {
      throw new ServiceError(error.status, error.message);
    }
    throw new ServiceError(500, error instanceof Error ? error.message : "Unable to append message.");
  }
}
